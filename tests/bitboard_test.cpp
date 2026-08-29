#include <chess/bitboard.hpp>

#include <gtest/gtest.h>

TEST(SquareIndex, MapsFileAndRankToZeroBasedIndex) {
    EXPECT_EQ(chess::square_index(0, 0), 0);
    EXPECT_EQ(chess::square_index(7, 0), 7);
    EXPECT_EQ(chess::square_index(0, 1), 8);
    EXPECT_EQ(chess::square_index(7, 7), 63);
}
