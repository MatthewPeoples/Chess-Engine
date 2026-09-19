// The leaping attack sets. Wrapping round the edge of the board is the bug these are
// written to catch, so every piece gets tested from a corner and an edge as well as the middle.

#include "bitboard.hpp"

#include <bit>
#include <initializer_list>

#include <gtest/gtest.h>

using namespace chess;

TEST(Bitboard, ShiftsDropOffTheEdge) {
    EXPECT_EQ(shift_north(square_bb(SQ_E8)), 0ULL);
    EXPECT_EQ(shift_south(square_bb(SQ_E1)), 0ULL);
    EXPECT_EQ(shift_east(square_bb(SQ_H4)), 0ULL);
    EXPECT_EQ(shift_west(square_bb(SQ_A4)), 0ULL);
    EXPECT_EQ(shift_north_east(square_bb(SQ_H4)), 0ULL);
    EXPECT_EQ(shift_south_west(square_bb(SQ_A4)), 0ULL);
}

TEST(Bitboard, ShiftsMoveOneSquare) {
    EXPECT_EQ(shift_north(square_bb(SQ_E4)), square_bb(SQ_E5));
    EXPECT_EQ(shift_east(square_bb(SQ_E4)), square_bb(SQ_F4));
    EXPECT_EQ(shift_north_west(square_bb(SQ_E4)), square_bb(SQ_D5));
    EXPECT_EQ(shift_south_east(square_bb(SQ_E4)), square_bb(SQ_F3));
}

TEST(Bitboard, KnightAttacks) {
    EXPECT_EQ(knight_attacks(SQ_A1), square_bb(SQ_B3) | square_bb(SQ_C2));
    EXPECT_EQ(knight_attacks(SQ_B1), square_bb(SQ_A3) | square_bb(SQ_C3) | square_bb(SQ_D2));
    EXPECT_EQ(knight_attacks(SQ_H8), square_bb(SQ_F7) | square_bb(SQ_G6));
    EXPECT_EQ(std::popcount(knight_attacks(SQ_D4)), 8);

    // a knight on the h-file must not appear on the a-file
    EXPECT_EQ(knight_attacks(SQ_H4) & FILE_A_BB, 0ULL);
    EXPECT_EQ(knight_attacks(SQ_A4) & FILE_H_BB, 0ULL);
}

TEST(Bitboard, KingAttacks) {
    EXPECT_EQ(king_attacks(SQ_A1), square_bb(SQ_A2) | square_bb(SQ_B1) | square_bb(SQ_B2));
    EXPECT_EQ(king_attacks(SQ_H8), square_bb(SQ_G8) | square_bb(SQ_H7) | square_bb(SQ_G7));
    EXPECT_EQ(std::popcount(king_attacks(SQ_E4)), 8);
    EXPECT_EQ(king_attacks(SQ_H4) & FILE_A_BB, 0ULL);
}

TEST(Bitboard, PawnAttacks) {
    EXPECT_EQ(pawn_attacks(WHITE, SQ_E4), square_bb(SQ_D5) | square_bb(SQ_F5));
    EXPECT_EQ(pawn_attacks(BLACK, SQ_E5), square_bb(SQ_D4) | square_bb(SQ_F4));

    // on a file edge there is only one capture
    EXPECT_EQ(pawn_attacks(WHITE, SQ_A2), square_bb(SQ_B3));
    EXPECT_EQ(pawn_attacks(BLACK, SQ_H7), square_bb(SQ_G6));

    // nothing left to capture from the far rank
    EXPECT_EQ(pawn_attacks(WHITE, SQ_E8), 0ULL);
    EXPECT_EQ(pawn_attacks(BLACK, SQ_E1), 0ULL);
}

// the published totals for a whole board: every square counted once
TEST(Bitboard, TotalMoveCounts) {
    int knights = 0;
    int kings   = 0;
    for (int sq = SQ_A1; sq <= SQ_H8; ++sq) {
        knights += std::popcount(knight_attacks(Square(sq)));
        kings += std::popcount(king_attacks(Square(sq)));
    }

    EXPECT_EQ(knights, 336);
    EXPECT_EQ(kings, 420);
}

// if a knight on x attacks y, a knight on y attacks x
TEST(Bitboard, KnightAttacksAreSymmetric) {
    for (int from = SQ_A1; from <= SQ_H8; ++from) {
        for (int to = SQ_A1; to <= SQ_H8; ++to) {
            const bool forwards  = (knight_attacks(Square(from)) & square_bb(Square(to))) != 0;
            const bool backwards = (knight_attacks(Square(to)) & square_bb(Square(from))) != 0;
            EXPECT_EQ(forwards, backwards);
        }
    }
}

namespace {

// spells an expected attack set out square by square
constexpr Bitboard bb_of(std::initializer_list<Square> squares) {
    Bitboard bb = 0;
    for (const Square sq : squares) {
        bb |= square_bb(sq);
    }
    return bb;
}

}  // namespace

TEST(Bitboard, SlidersOnAnEmptyBoard) {
    EXPECT_EQ(rook_attacks(SQ_A1, 0), bb_of({SQ_A2, SQ_A3, SQ_A4, SQ_A5, SQ_A6, SQ_A7, SQ_A8, SQ_B1, SQ_C1, SQ_D1,
                                             SQ_E1, SQ_F1, SQ_G1, SQ_H1}));
    EXPECT_EQ(bishop_attacks(SQ_C1, 0), bb_of({SQ_B2, SQ_A3, SQ_D2, SQ_E3, SQ_F4, SQ_G5, SQ_H6}));

    // a rook sees 14 squares from anywhere; a bishop sees more from the middle than the edge
    EXPECT_EQ(std::popcount(rook_attacks(SQ_D4, 0)), 14);
    EXPECT_EQ(std::popcount(rook_attacks(SQ_H8, 0)), 14);
    EXPECT_EQ(std::popcount(bishop_attacks(SQ_D4, 0)), 13);
    EXPECT_EQ(std::popcount(bishop_attacks(SQ_A1, 0)), 7);
}

TEST(Bitboard, RaysStopOnTheFirstPieceAndIncludeIt) {
    const Bitboard occupied = bb_of({SQ_A4, SQ_C1});
    EXPECT_EQ(rook_attacks(SQ_A1, occupied), bb_of({SQ_A2, SQ_A3, SQ_A4, SQ_B1, SQ_C1}));

    const Bitboard diagonal = bb_of({SQ_F6, SQ_B2});
    EXPECT_EQ(bishop_attacks(SQ_D4, diagonal),
              bb_of({SQ_E5, SQ_F6, SQ_C5, SQ_B6, SQ_A7, SQ_E3, SQ_F2, SQ_G1, SQ_C3, SQ_B2}));
}

TEST(Bitboard, SlidersDoNotWrapRound) {
    EXPECT_EQ(bishop_attacks(SQ_H4, 0), bb_of({SQ_G3, SQ_F2, SQ_E1, SQ_G5, SQ_F6, SQ_E7, SQ_D8}));

    // west stops at g4 and east runs off the board, so nothing on the a-file
    EXPECT_EQ(rook_attacks(SQ_H4, square_bb(SQ_G4)) & FILE_A_BB, 0ULL);
}

TEST(Bitboard, QueenIsRookPlusBishop) {
    const Bitboard occupied = bb_of({SQ_D2, SQ_F6, SQ_B4});

    for (int sq = SQ_A1; sq <= SQ_H8; ++sq) {
        EXPECT_EQ(queen_attacks(Square(sq), occupied),
                  rook_attacks(Square(sq), occupied) | bishop_attacks(Square(sq), occupied));
    }
}

// same occupancy both ways round, so if one square sees another it must see it back
TEST(Bitboard, SlidingAttacksAreSymmetric) {
    const Bitboard occupied = bb_of({SQ_C3, SQ_D5, SQ_F2, SQ_G7});

    for (int from = SQ_A1; from <= SQ_H8; ++from) {
        for (int to = SQ_A1; to <= SQ_H8; ++to) {
            const bool forwards  = (queen_attacks(Square(from), occupied) & square_bb(Square(to))) != 0;
            const bool backwards = (queen_attacks(Square(to), occupied) & square_bb(Square(from))) != 0;
            EXPECT_EQ(forwards, backwards);
        }
    }
}
