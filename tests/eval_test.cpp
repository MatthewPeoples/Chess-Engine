// The evaluation is only asked to be consistent: even at the start, symmetric between colours,
// and pointing the right way when material is uneven.

#include "eval.hpp"

#include <string_view>

#include <gtest/gtest.h>

using namespace chess;

namespace {

int score_of(std::string_view fen) {
    const auto pos = Position::from_fen(fen);
    EXPECT_TRUE(pos.has_value()) << fen;
    return evaluate(pos.value_or(Position::start()));
}

}  // namespace

TEST(Eval, TheStartPositionIsEven) {
    EXPECT_EQ(score_of(START_FEN), 0);
}

TEST(Eval, MirroredPositionsScoreTheSame) {
    // the same position with the colours swapped, each from the mover's point of view
    EXPECT_EQ(score_of("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1"),
              score_of("r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1"));
}

TEST(Eval, MaterialCounts) {
    // white a queen up, from white's point of view
    EXPECT_GT(score_of("4k3/8/8/8/8/8/8/3QK3 w - - 0 1"), 800);

    // the same position with black to move, so the score flips
    EXPECT_LT(score_of("4k3/8/8/8/8/8/8/3QK3 b - - 0 1"), -800);
}

TEST(Eval, PiecesPreferTheCentre) {
    EXPECT_GT(score_of("4k3/8/8/3N4/8/8/8/4K3 w - - 0 1"), score_of("4k3/8/8/8/8/8/8/N3K3 w - - 0 1"));
}
