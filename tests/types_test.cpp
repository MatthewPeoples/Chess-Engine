#include "types.hpp"

#include <gtest/gtest.h>

using namespace chess;

// LERF indexing
TEST(Types, SquaresAreLerf) {
    EXPECT_EQ(SQ_A1, 0);
    EXPECT_EQ(SQ_H1, 7);
    EXPECT_EQ(SQ_A8, 56);
    EXPECT_EQ(SQ_H8, 63);
}

// make_square is inverse of file_of and rank_of
TEST(Types, MakeSquare) {
    EXPECT_EQ(make_square(FILE_A, RANK_1), SQ_A1);
    EXPECT_EQ(make_square(FILE_E, RANK_4), SQ_E4);
    EXPECT_EQ(make_square(FILE_H, RANK_8), SQ_H8);
}

// make_square is inverse of file_of and rank_of for all squares
TEST(Types, FileAndRankRoundTrip) {
    for (int i = SQ_A1; i <= SQ_H8; ++i) {
        const auto sq = Square(i);
        EXPECT_EQ(make_square(file_of(sq), rank_of(sq)), sq);
    }
}

// piece encoding is correct
TEST(Types, PieceEncoding) {
    EXPECT_EQ(W_KNIGHT, 2);
    EXPECT_EQ(B_KNIGHT, 10);
}

// make_piece is inverse of colour_of and type_of for all pieces
TEST(Types, PieceRoundTrip) {
    for (Colour c : {WHITE, BLACK}) {
        for (PieceType pt : {PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING}) {
            const Piece pc = make_piece(c, pt);
            EXPECT_EQ(colour_of(pc), c);
            EXPECT_EQ(type_of(pc), pt);
        }
    }
}

// square_bb is correct for all squares
TEST(Types, SquareBb) {
    EXPECT_EQ(square_bb(SQ_A1), 0x0000000000000001ULL);
    EXPECT_EQ(square_bb(SQ_E4), 0x0000000010000000ULL);
    EXPECT_EQ(square_bb(SQ_H8), 0x8000000000000000ULL);
}

// is_ok is correct for all squares
TEST(Types, IsOk) {
    EXPECT_TRUE(is_ok(SQ_A1));
    EXPECT_TRUE(is_ok(SQ_H8));
    EXPECT_FALSE(is_ok(SQ_NONE));
}
