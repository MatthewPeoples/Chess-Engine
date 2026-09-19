#include "position.hpp"

#include "bitboard.hpp"

#include <array>
#include <bit>
#include <cassert>
#include <charconv>
#include <cstddef>
#include <ostream>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

namespace chess {

namespace {

// --- Text shared by FEN and printing ---
// indexed by Piece: W_PAWN = 1 is 'P', B_PAWN = 9 is 'p', and NO_PIECE = 0 is an empty square
constexpr std::string_view PIECE_TO_CHAR = ".PNBRQK  pnbrqk";

std::string castling_string(CastlingRights cr) {
    std::string out;
    if ((cr & WHITE_OO) != 0) {
        out += 'K';
    }
    if ((cr & WHITE_OOO) != 0) {
        out += 'Q';
    }
    if ((cr & BLACK_OO) != 0) {
        out += 'k';
    }
    if ((cr & BLACK_OOO) != 0) {
        out += 'q';
    }
    return out.empty() ? "-" : out;
}

// --- Reading one FEN field at a time ---

// FEN fields are separated by spaces; a FEN may carry the first four or all six
std::vector<std::string_view> split_fields(std::string_view text) {
    std::vector<std::string_view> out;
    std::size_t i = 0;
    while (i < text.size()) {
        while (i < text.size() && text[i] == ' ') {
            ++i;
        }
        const std::size_t start = i;
        while (i < text.size() && text[i] != ' ') {
            ++i;
        }
        if (i > start) {
            out.push_back(text.substr(start, i - start));
        }
    }
    return out;
}

std::optional<Piece> piece_from_char(char ch) {
    const std::size_t i = PIECE_TO_CHAR.find(ch);
    if (i == std::string_view::npos || i == 0 || ch == ' ') {  // 0 is the empty square, 7 and 8 are the gap
        return std::nullopt;
    }
    return Piece(i);
}

std::optional<Square> square_from_name(std::string_view name) {
    if (name.size() != 2 || name[0] < 'a' || name[0] > 'h' || name[1] < '1' || name[1] > '8') {
        return std::nullopt;
    }
    return make_square(File(name[0] - 'a'), Rank(name[1] - '1'));
}

std::optional<int> parse_number(std::string_view text) {
    int value                   = 0;
    const char* begin           = text.data();
    const char* end             = begin + text.size();
    const auto [stopped, error] = std::from_chars(begin, end, value);
    if (error != std::errc{} || stopped != end || value < 0) {
        return std::nullopt;
    }
    return value;
}

// placement runs rank 8 down to rank 1, each rank a to h; a digit is that many empty squares
std::optional<std::array<Piece, SQUARE_NB>> parse_placement(std::string_view text) {
    std::array<Piece, SQUARE_NB> squares{};
    int rank = RANK_8;
    int file = FILE_A;

    for (const char ch : text) {
        if (ch == '/') {
            if (file != FILE_NB || rank == RANK_1) {
                return std::nullopt;
            }
            --rank;
            file = FILE_A;
        } else if (ch >= '1' && ch <= '8') {
            file += ch - '0';
            if (file > FILE_NB) {
                return std::nullopt;
            }
        } else {
            const std::optional<Piece> pc = piece_from_char(ch);
            if (!pc.has_value() || file >= FILE_NB) {
                return std::nullopt;
            }
            squares[make_square(File(file), Rank(rank))] = *pc;
            ++file;
        }
    }

    if (rank != RANK_1 || file != FILE_NB) {
        return std::nullopt;
    }
    return squares;
}

std::optional<CastlingRights> parse_castling(std::string_view text) {
    if (text == "-") {
        return NO_CASTLING;
    }

    int rights = NO_CASTLING;
    for (const char ch : text) {
        int right = NO_CASTLING;
        switch (ch) {
        case 'K':
            right = WHITE_OO;
            break;
        case 'Q':
            right = WHITE_OOO;
            break;
        case 'k':
            right = BLACK_OO;
            break;
        case 'q':
            right = BLACK_OOO;
            break;
        default:
            return std::nullopt;
        }
        if ((rights & right) != 0) {
            return std::nullopt;
        }
        rights |= right;
    }
    return CastlingRights(rights);
}

// the capture square sits behind the pawn that just moved two, so its rank follows the side to move
std::optional<Square> parse_ep(std::string_view text, Colour side) {
    if (text == "-") {
        return SQ_NONE;
    }

    const std::optional<Square> sq = square_from_name(text);
    const Rank wanted              = side == WHITE ? RANK_6 : RANK_3;
    if (!sq.has_value() || rank_of(*sq) != wanted) {
        return std::nullopt;
    }
    return sq;
}

bool exactly_one_king(const Position& pos) {
    return std::popcount(pos.pieces(WHITE, KING)) == 1 && std::popcount(pos.pieces(BLACK, KING)) == 1;
}

}  // namespace

// --- Building a position ---

Position Position::start() {
    constexpr std::array<PieceType, FILE_NB> backRank = {ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK};

    Position pos;
    for (int f = FILE_A; f <= FILE_H; ++f) {
        const auto file = File(f);
        pos.put_piece(make_piece(WHITE, backRank[f]), make_square(file, RANK_1));
        pos.put_piece(W_PAWN, make_square(file, RANK_2));
        pos.put_piece(B_PAWN, make_square(file, RANK_7));
        pos.put_piece(make_piece(BLACK, backRank[f]), make_square(file, RANK_8));
    }
    pos.castlingRights = ANY_CASTLING;
    return pos;
}

// the only way pieces get onto the board, so the array and the bitboards can't drift apart
void Position::put_piece(Piece pc, Square sq) {
    assert(is_ok(sq));
    // an occupied square would leave the old piece's bits behind
    assert(board[sq] == NO_PIECE);

    board[sq] = pc;
    byTypeBB[ALL_PIECES] |= square_bb(sq);
    byTypeBB[type_of(pc)] |= square_bb(sq);
    byColourBB[colour_of(pc)] |= square_bb(sq);
}

void Position::remove_piece(Square sq) {
    const Piece pc = board[sq];
    assert(pc != NO_PIECE);

    board[sq] = NO_PIECE;
    byTypeBB[ALL_PIECES] ^= square_bb(sq);
    byTypeBB[type_of(pc)] ^= square_bb(sq);
    byColourBB[colour_of(pc)] ^= square_bb(sq);
}

void Position::move_piece(Square from, Square to) {
    const Piece pc = board[from];
    assert(pc != NO_PIECE);
    assert(board[to] == NO_PIECE);

    const Bitboard both = square_bb(from) | square_bb(to);
    board[from]         = NO_PIECE;
    board[to]           = pc;
    byTypeBB[ALL_PIECES] ^= both;
    byTypeBB[type_of(pc)] ^= both;
    byColourBB[colour_of(pc)] ^= both;
}

// --- Where the pieces are, and the rest of the state ---

Bitboard Position::pieces() const {
    return byTypeBB[ALL_PIECES];
}

Bitboard Position::pieces(Colour c) const {
    return byColourBB[c];
}

Bitboard Position::pieces(PieceType pt) const {
    return byTypeBB[pt];
}

Bitboard Position::pieces(Colour c, PieceType pt) const {
    return byColourBB[c] & byTypeBB[pt];
}

Piece Position::piece_on(Square sq) const {
    return board[sq];
}

Colour Position::side_to_move() const {
    return sideToMove;
}

CastlingRights Position::castling_rights() const {
    return castlingRights;
}

Square Position::ep_square() const {
    return epSquare;
}

int Position::rule50_count() const {
    return rule50;
}

int Position::fullmove_number() const {
    return fullmoveNumber;
}

// --- FEN in and out ---

std::optional<Position> Position::from_fen(std::string_view fen) {
    const std::vector<std::string_view> field = split_fields(fen);
    if (field.size() != 4 && field.size() != 6) {
        return std::nullopt;
    }

    const std::optional<std::array<Piece, SQUARE_NB>> squares = parse_placement(field[0]);
    if (!squares.has_value()) {
        return std::nullopt;
    }
    if (field[1] != "w" && field[1] != "b") {
        return std::nullopt;
    }
    const Colour side = field[1] == "w" ? WHITE : BLACK;

    const std::optional<CastlingRights> rights = parse_castling(field[2]);
    const std::optional<Square> ep             = parse_ep(field[3], side);
    if (!rights.has_value() || !ep.has_value()) {
        return std::nullopt;
    }

    int halfmove = 0;
    int fullmove = 1;
    if (field.size() == 6) {
        const std::optional<int> parsedHalf = parse_number(field[4]);
        const std::optional<int> parsedFull = parse_number(field[5]);
        if (!parsedHalf.has_value() || !parsedFull.has_value() || *parsedFull < 1) {
            return std::nullopt;
        }
        halfmove = *parsedHalf;
        fullmove = *parsedFull;
    }

    Position pos;
    for (int i = SQ_A1; i <= SQ_H8; ++i) {
        if ((*squares)[i] != NO_PIECE) {
            pos.put_piece((*squares)[i], Square(i));
        }
    }
    pos.sideToMove     = side;
    pos.castlingRights = *rights;
    pos.epSquare       = *ep;
    pos.rule50         = halfmove;
    pos.fullmoveNumber = fullmove;

    if (!exactly_one_king(pos)) {
        return std::nullopt;
    }
    return pos;
}

std::string Position::fen() const {
    std::string out;

    for (int r = RANK_8; r >= RANK_1; --r) {
        int empty = 0;
        for (int f = FILE_A; f <= FILE_H; ++f) {
            const Piece pc = piece_on(make_square(File(f), Rank(r)));
            if (pc == NO_PIECE) {
                ++empty;
                continue;
            }
            if (empty > 0) {
                out += static_cast<char>('0' + empty);
                empty = 0;
            }
            out += PIECE_TO_CHAR[pc];
        }
        if (empty > 0) {
            out += static_cast<char>('0' + empty);
        }
        if (r != RANK_1) {
            out += '/';
        }
    }

    out += sideToMove == WHITE ? " w " : " b ";
    out += castling_string(castlingRights);
    out += ' ';
    out += epSquare == SQ_NONE ? "-" : square_name(epSquare);
    out += ' ' + std::to_string(rule50);
    out += ' ' + std::to_string(fullmoveNumber);
    return out;
}

// --- Playing moves ---

namespace {

// the castling rights a piece leaving or landing on this square destroys
constexpr int rights_removed(Square sq) {
    switch (sq) {
    case SQ_E1:
        return WHITE_OO | WHITE_OOO;
    case SQ_A1:
        return WHITE_OOO;
    case SQ_H1:
        return WHITE_OO;
    case SQ_E8:
        return BLACK_OO | BLACK_OOO;
    case SQ_A8:
        return BLACK_OOO;
    case SQ_H8:
        return BLACK_OO;
    default:
        return NO_CASTLING;
    }
}

// where the rook starts and ends, worked out from where the king lands
std::pair<Square, Square> castling_rook(Square kingFrom, Square kingTo) {
    const bool kingside = kingTo > kingFrom;
    return {kingside ? Square(kingTo + 1) : Square(kingTo - 2), kingside ? Square(kingTo - 1) : Square(kingTo + 1)};
}

}  // namespace

Undo Position::do_move(Move m) {
    const Colour us   = sideToMove;
    const Square from = m.from_sq();
    const Square to   = m.to_sq();
    const Piece moved = board[from];

    assert(moved != NO_PIECE);

    Undo undo;
    undo.move           = m;
    undo.movedPiece     = moved;
    undo.castlingRights = castlingRights;
    undo.epSquare       = epSquare;
    undo.rule50         = rule50;

    // en passant takes a pawn that is not standing on the square the move lands on
    const Square capturedOn = m.type() == EN_PASSANT ? Square(to - (us == WHITE ? 8 : -8)) : to;
    const Piece captured    = m.type() == CASTLING ? NO_PIECE : board[capturedOn];

    if (captured != NO_PIECE) {
        undo.capturedPiece = captured;
        undo.capturedOn    = capturedOn;
        remove_piece(capturedOn);
    }

    if (m.type() == CASTLING) {
        const auto [rookFrom, rookTo] = castling_rook(from, to);
        move_piece(from, to);
        move_piece(rookFrom, rookTo);
    } else if (m.type() == PROMOTION) {
        remove_piece(from);
        put_piece(make_piece(us, m.promotion_piece()), to);
    } else {
        move_piece(from, to);
    }

    // a rook captured on its home square loses the rights just as surely as one that moves
    castlingRights = CastlingRights(castlingRights & ~rights_removed(from) & ~rights_removed(to));

    // only a double push leaves a square behind it
    epSquare = SQ_NONE;
    if (type_of(moved) == PAWN && (to > from ? to - from : from - to) == 16) {
        epSquare = Square((from + to) / 2);
    }

    rule50 = type_of(moved) == PAWN || captured != NO_PIECE ? 0 : rule50 + 1;
    if (us == BLACK) {
        ++fullmoveNumber;
    }
    sideToMove = ~us;

    return undo;
}

void Position::undo_move(const Undo& undo) {
    sideToMove        = ~sideToMove;  // back to the side that made the move
    const Move m      = undo.move;
    const Square from = m.from_sq();
    const Square to   = m.to_sq();

    if (m.type() == CASTLING) {
        const auto [rookFrom, rookTo] = castling_rook(from, to);
        move_piece(rookTo, rookFrom);
        move_piece(to, from);
    } else if (m.type() == PROMOTION) {
        remove_piece(to);
        put_piece(undo.movedPiece, from);
    } else {
        move_piece(to, from);
    }

    if (undo.capturedPiece != NO_PIECE) {
        put_piece(undo.capturedPiece, undo.capturedOn);
    }

    castlingRights = undo.castlingRights;
    epSquare       = undo.epSquare;
    rule50         = undo.rule50;
    if (sideToMove == BLACK) {
        --fullmoveNumber;
    }
}

// --- Attacks ---

bool Position::is_attacked(Square sq, Colour by) const {
    const Bitboard occupied = pieces();

    // pawns are the one asymmetric piece: to find black pawns hitting this square, ask where a
    // white pawn standing here would capture
    if ((pawn_attacks(~by, sq) & pieces(by, PAWN)) != 0) {
        return true;
    }
    if ((knight_attacks(sq) & pieces(by, KNIGHT)) != 0) {
        return true;
    }
    if ((king_attacks(sq) & pieces(by, KING)) != 0) {
        return true;
    }
    if ((bishop_attacks(sq, occupied) & (pieces(by, BISHOP) | pieces(by, QUEEN))) != 0) {
        return true;
    }
    return (rook_attacks(sq, occupied) & (pieces(by, ROOK) | pieces(by, QUEEN))) != 0;
}

Square Position::king_square(Colour c) const {
    return lsb(pieces(c, KING));
}

bool Position::in_check(Colour c) const {
    return is_attacked(king_square(c), ~c);
}

// --- Printing ---

// rank 8 first because that's the top of the printed board
void print(const Position& pos, std::ostream& os) {
    for (int r = RANK_8; r >= RANK_1; --r) {
        os << r + 1 << ' ';
        for (int f = FILE_A; f <= FILE_H; ++f) {
            os << ' ' << PIECE_TO_CHAR[pos.piece_on(make_square(File(f), Rank(r)))];
        }
        os << '\n';
    }
    os << "   a b c d e f g h\n\n";

    const Square ep = pos.ep_square();
    os << "side to move: " << (pos.side_to_move() == WHITE ? "white" : "black") << '\n'
       << "castling:     " << castling_string(pos.castling_rights()) << '\n'
       << "en passant:   " << (ep == SQ_NONE ? "-" : square_name(ep)) << '\n'
       << "halfmove:     " << pos.rule50_count() << '\n'
       << "fullmove:     " << pos.fullmove_number() << '\n';
}

}  // namespace chess
