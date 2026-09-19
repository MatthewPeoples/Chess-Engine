#include "movegen.hpp"

#include <array>
#include <cstddef>

#include "bitboard.hpp"

namespace chess {

namespace {

// --- Pawns ---

// every set bit is a destination, and the pawn that got there started delta squares back
void add_pawn_moves(MoveList& list, Bitboard destinations, int delta, Bitboard promotionRank) {
    Bitboard quiet = destinations & ~promotionRank;
    while (quiet != 0) {
        const Square to = pop_lsb(quiet);
        list.add(Move(Square(to - delta), to));
    }

    Bitboard promoting = destinations & promotionRank;
    while (promoting != 0) {
        const Square to = pop_lsb(promoting);
        const auto from = Square(to - delta);
        for (const PieceType pt : {QUEEN, ROOK, BISHOP, KNIGHT}) {
            list.add(Move::promotion(from, to, pt));
        }
    }
}

// pawns are the one piece where everyone moves the same way, so the whole set shifts at once
void generate_pawn_pushes(const Position& pos, MoveList& list) {
    const Colour us      = pos.side_to_move();
    const Bitboard pawns = pos.pieces(us, PAWN);
    const Bitboard empty = ~pos.pieces();
    const bool white     = us == WHITE;

    const Bitboard pushes  = (white ? shift_north(pawns) : shift_south(pawns)) & empty;
    const Bitboard fromTwo = pushes & rank_bb(white ? RANK_3 : RANK_6);
    const Bitboard doubles = (white ? shift_north(fromTwo) : shift_south(fromTwo)) & empty;

    add_pawn_moves(list, pushes, white ? 8 : -8, rank_bb(white ? RANK_8 : RANK_1));
    add_pawn_moves(list, doubles, white ? 16 : -16, 0);  // a double push can never promote
}

void generate_pawn_captures(const Position& pos, MoveList& list) {
    const Colour us      = pos.side_to_move();
    const Bitboard pawns = pos.pieces(us, PAWN);
    const bool white     = us == WHITE;

    const Bitboard enemies       = pos.pieces(~us);
    const Bitboard promotionRank = rank_bb(white ? RANK_8 : RANK_1);
    const Bitboard east          = (white ? shift_north_east(pawns) : shift_south_east(pawns)) & enemies;
    const Bitboard west          = (white ? shift_north_west(pawns) : shift_south_west(pawns)) & enemies;

    add_pawn_moves(list, east, white ? 9 : -7, promotionRank);
    add_pawn_moves(list, west, white ? 7 : -9, promotionRank);

    // en passant lands on an empty square, so no target mask would ever include it
    if (pos.ep_square() != SQ_NONE) {
        // our pawns that attack the square are the ones a their-coloured pawn there would attack
        Bitboard takers = pawns & pawn_attacks(~us, pos.ep_square());
        while (takers != 0) {
            list.add(Move::en_passant(pop_lsb(takers), pos.ep_square()));
        }
    }
}

// --- Everything except pawns ---

void generate_pieces(const Position& pos, MoveList& list, Bitboard target) {
    const Colour us         = pos.side_to_move();
    const Bitboard occupied = pos.pieces();

    for (const PieceType pt : {KNIGHT, BISHOP, ROOK, QUEEN, KING}) {
        Bitboard from = pos.pieces(us, pt);
        while (from != 0) {
            const Square sq = pop_lsb(from);

            Bitboard to = piece_attacks(pt, sq, occupied) & target;
            while (to != 0) {
                list.add(Move(sq, pop_lsb(to)));
            }
        }
    }
}

// --- Castling ---

struct CastlingPath {
    CastlingRights right;
    Square kingFrom;
    Square kingTo;
    Bitboard mustBeEmpty;
};

// white first, then black, so the side to move picks its two by index
constexpr std::array<CastlingPath, 4> CASTLING_PATHS = {{
    {.right = WHITE_OO, .kingFrom = SQ_E1, .kingTo = SQ_G1, .mustBeEmpty = square_bb(SQ_F1) | square_bb(SQ_G1)},
    {.right       = WHITE_OOO,
     .kingFrom    = SQ_E1,
     .kingTo      = SQ_C1,
     .mustBeEmpty = square_bb(SQ_B1) | square_bb(SQ_C1) | square_bb(SQ_D1)},
    {.right = BLACK_OO, .kingFrom = SQ_E8, .kingTo = SQ_G8, .mustBeEmpty = square_bb(SQ_F8) | square_bb(SQ_G8)},
    {.right       = BLACK_OOO,
     .kingFrom    = SQ_E8,
     .kingTo      = SQ_C8,
     .mustBeEmpty = square_bb(SQ_B8) | square_bb(SQ_C8) | square_bb(SQ_D8)},
}};

// rights and empty squares only; not moving into, through or out of check is milestone 8
void generate_castling(const Position& pos, MoveList& list) {
    const std::size_t first = pos.side_to_move() == WHITE ? 0 : 2;

    for (std::size_t i = first; i < first + 2; ++i) {
        const CastlingPath& path = CASTLING_PATHS[i];

        if ((pos.castling_rights() & path.right) == 0) {
            continue;
        }
        if ((pos.pieces() & path.mustBeEmpty) != 0) {
            continue;
        }
        list.add(Move::castling(path.kingFrom, path.kingTo));
    }
}

// the only thing the generation type changes for pieces: where they are allowed to land
template <GenType T> Bitboard targets(const Position& pos) {
    if constexpr (T == CAPTURES) {
        return pos.pieces(~pos.side_to_move());
    } else if constexpr (T == QUIETS) {
        return ~pos.pieces();
    } else {
        return ~pos.pieces(pos.side_to_move());
    }
}

}  // namespace

template <GenType T> void generate(const Position& pos, MoveList& list) {
    if constexpr (T != CAPTURES) {
        generate_pawn_pushes(pos, list);
    }
    if constexpr (T != QUIETS) {
        generate_pawn_captures(pos, list);
    }

    generate_pieces(pos, list, targets<T>(pos));

    if constexpr (T != CAPTURES) {
        generate_castling(pos, list);
    }
}

void generate_legal(Position& pos, MoveList& list) {
    const Colour us = pos.side_to_move();

    MoveList pseudo;
    generate<ALL>(pos, pseudo);

    for (const Move m : pseudo) {
        // a king may not castle out of check or across an attacked square
        // where it lands is covered by the general test below
        if (m.type() == CASTLING) {
            const auto crossed = Square((m.from_sq() + m.to_sq()) / 2);
            if (pos.is_attacked(m.from_sq(), ~us) || pos.is_attacked(crossed, ~us)) {
                continue;
            }
        }

        const Undo undo = pos.do_move(m);
        if (!pos.in_check(us)) {
            list.add(m);
        }
        pos.undo_move(undo);
    }
}

// there are only three of these, so they are built here rather than in every file that calls them
template void generate<CAPTURES>(const Position&, MoveList&);
template void generate<QUIETS>(const Position&, MoveList&);
template void generate<ALL>(const Position&, MoveList&);

}  // namespace chess
