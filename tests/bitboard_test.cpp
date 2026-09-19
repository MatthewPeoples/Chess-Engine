// The leaping attack sets. Wrapping round the edge of the board is the bug these are
// written to catch, so every piece gets tested from a corner and an edge as well as the middle.

#include "bitboard.hpp"

#include <bit>

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