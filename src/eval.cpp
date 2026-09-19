#include "eval.hpp"

#include <array>
#include <bit>

#include "bitboard.hpp"

namespace chess {

namespace {

// clang-format off
// Tables are written the way a board is drawn, a8 first and h1 last, so they can be read.
// Square numbering runs the other way, so white looks up sq ^ 56 and black looks up sq,
// which mirrors the table for the other side.
using Table = std::array<int, SQUARE_NB>;

constexpr Table PAWN_TABLE = {
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
};

constexpr Table KNIGHT_TABLE = {
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
};

constexpr Table BISHOP_TABLE = {
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
};

constexpr Table ROOK_TABLE = {
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0,
};

constexpr Table QUEEN_TABLE = {
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
};

// safety behind its own pawns while there is still material on
constexpr Table KING_MIDDLEGAME_TABLE = {
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
};

// once the queens are gone the king belongs in the middle
constexpr Table KING_ENDGAME_TABLE = {
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50,
};
// clang-format on

const Table& table_for(PieceType pt, bool endgame) {
    switch (pt) {
    case PAWN:
        return PAWN_TABLE;
    case KNIGHT:
        return KNIGHT_TABLE;
    case BISHOP:
        return BISHOP_TABLE;
    case ROOK:
        return ROOK_TABLE;
    case QUEEN:
        return QUEEN_TABLE;
    default:
        return endgame ? KING_ENDGAME_TABLE : KING_MIDDLEGAME_TABLE;
    }
}

// everything that is not a pawn or a king, both sides added together
int non_pawn_material(const Position& pos) {
    int total = 0;
    for (const PieceType pt : {KNIGHT, BISHOP, ROOK, QUEEN}) {
        total += std::popcount(pos.pieces(pt)) * piece_value(pt);
    }
    return total;
}

int score_for(const Position& pos, Colour c, bool endgame) {
    int score = 0;

    for (const PieceType pt : {PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING}) {
        const Table& table = table_for(pt, endgame);

        Bitboard men = pos.pieces(c, pt);
        while (men != 0) {
            const Square sq = pop_lsb(men);
            score += piece_value(pt) + table[c == WHITE ? sq ^ 56 : sq];
        }
    }
    return score;
}

}  // namespace

int evaluate(const Position& pos) {
    // a rook and a bishop each is about where kings stop hiding and start helping
    const bool endgame = non_pawn_material(pos) <= 2 * (piece_value(ROOK) + piece_value(BISHOP));

    const int score = score_for(pos, WHITE, endgame) - score_for(pos, BLACK, endgame);
    return pos.side_to_move() == WHITE ? score : -score;
}

}  // namespace chess
