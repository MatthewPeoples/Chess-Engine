// Pseudo-legal generation, checked on positions small enough to count by hand.

#include "movegen.hpp"

#include <algorithm>
#include <string>
#include <string_view>
#include <vector>

#include <gtest/gtest.h>

using namespace chess;

namespace {

template <GenType T> std::vector<std::string> names(std::string_view fen) {
    const auto pos = Position::from_fen(fen);
    EXPECT_TRUE(pos.has_value()) << fen;

    MoveList list;
    generate<T>(*pos, list);

    std::vector<std::string> out;
    for (const Move m : list) {
        out.push_back(move_name(m));
    }
    std::ranges::sort(out);
    return out;
}

bool contains(const std::vector<std::string>& moves, std::string_view name) {
    return std::ranges::find(moves, name) != moves.end();
}

}  // namespace

TEST(MoveGen, StartPositionHasTwentyMoves) {
    EXPECT_EQ(names<ALL>(START_FEN).size(), 20U);
    EXPECT_EQ(names<QUIETS>(START_FEN).size(), 20U);
    EXPECT_EQ(names<CAPTURES>(START_FEN).size(), 0U);

    const auto moves = names<ALL>(START_FEN);
    EXPECT_TRUE(contains(moves, "e2e4"));
    EXPECT_TRUE(contains(moves, "e2e3"));
    EXPECT_TRUE(contains(moves, "g1f3"));
    EXPECT_FALSE(contains(moves, "e2e5"));
}

TEST(MoveGen, LonePieces) {
    EXPECT_EQ(names<ALL>("4k3/8/8/8/3N4/8/8/4K3 w - - 0 1").size(), 8U + 5U);  // knight plus king
    // the rook sees 14 squares on an empty board, but its own king on e1 stops the rank at d1
    EXPECT_EQ(names<ALL>("4k3/8/8/8/8/8/8/R3K3 w - - 0 1").size(), 10U + 5U);
}

TEST(MoveGen, PawnPushesAndBlocks) {
    EXPECT_EQ(names<ALL>("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"),
              (std::vector<std::string>{"e1d1", "e1d2", "e1f1", "e1f2", "e2e3", "e2e4"}));

    // a piece on the square in between stops the double push as well as the single
    EXPECT_FALSE(contains(names<ALL>("4k3/8/8/8/8/4n3/4P3/4K3 w - - 0 1"), "e2e4"));
    EXPECT_FALSE(contains(names<ALL>("4k3/8/8/8/8/4n3/4P3/4K3 w - - 0 1"), "e2e3"));

    // only the far square blocked: the single push still stands
    EXPECT_TRUE(contains(names<ALL>("4k3/8/8/8/4n3/8/4P3/4K3 w - - 0 1"), "e2e3"));
    EXPECT_FALSE(contains(names<ALL>("4k3/8/8/8/4n3/8/4P3/4K3 w - - 0 1"), "e2e4"));
}

TEST(MoveGen, PawnCaptures) {
    const auto moves = names<CAPTURES>("4k3/8/8/3n1n2/4P3/8/8/4K3 w - - 0 1");
    EXPECT_EQ(moves, (std::vector<std::string>{"e4d5", "e4f5"}));

    // a pawn cannot capture straight ahead
    EXPECT_EQ(names<CAPTURES>("4k3/8/8/8/4n3/4P3/8/4K3 w - - 0 1").size(), 0U);
}

TEST(MoveGen, PromotionsAreFourMovesEach) {
    // push promotions only
    EXPECT_EQ(names<ALL>("4k3/P7/8/8/8/8/8/4K3 w - - 0 1").size(), 4U + 5U);

    // push plus capture, so eight promotion moves
    const auto moves = names<ALL>("1r2k3/P7/8/8/8/8/8/4K3 w - - 0 1");
    EXPECT_TRUE(contains(moves, "a7a8q"));
    EXPECT_TRUE(contains(moves, "a7a8n"));
    EXPECT_TRUE(contains(moves, "a7b8q"));
    EXPECT_TRUE(contains(moves, "a7b8b"));
    EXPECT_EQ(moves.size(), 8U + 5U);

    // a capture promotion is a capture, a push promotion is not
    EXPECT_EQ(names<CAPTURES>("1r2k3/P7/8/8/8/8/8/4K3 w - - 0 1").size(), 4U);
}

TEST(MoveGen, EnPassant) {
    // black has just played d7d5, so white's e5 pawn may take on d6
    const auto moves = names<ALL>("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
    EXPECT_TRUE(contains(moves, "e5d6"));

    // it is a capture, never a quiet move, even though the square it lands on is empty
    EXPECT_TRUE(contains(names<CAPTURES>("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1"), "e5d6"));
    EXPECT_FALSE(contains(names<QUIETS>("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1"), "e5d6"));

    // no en passant square means no such move
    EXPECT_FALSE(contains(names<ALL>("4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1"), "e5d6"));
}

TEST(MoveGen, BlackMovesDownTheBoard) {
    const auto moves = names<ALL>("4k3/4p3/8/8/8/8/8/4K3 b - - 0 1");
    EXPECT_TRUE(contains(moves, "e7e6"));
    EXPECT_TRUE(contains(moves, "e7e5"));

    EXPECT_TRUE(contains(names<CAPTURES>("4k3/4p3/3N1N2/8/8/8/8/4K3 b - - 0 1"), "e7d6"));
    EXPECT_TRUE(contains(names<ALL>("4k3/8/8/8/8/8/p7/4K3 b - - 0 1"), "a2a1q"));
}

TEST(MoveGen, Castling) {
    const auto moves = names<ALL>("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    EXPECT_TRUE(contains(moves, "e1g1"));
    EXPECT_TRUE(contains(moves, "e1c1"));

    // rights removed
    EXPECT_FALSE(contains(names<ALL>("r3k2r/8/8/8/8/8/8/R3K2R w Kkq - 0 1"), "e1c1"));

    // a piece in the way, including on b1 which the king never crosses
    EXPECT_FALSE(contains(names<ALL>("r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1"), "e1c1"));
    EXPECT_FALSE(contains(names<ALL>("r3k2r/8/8/8/8/8/8/R3KN1R w KQkq - 0 1"), "e1g1"));

    // black castles too, and never appears in the capture list
    EXPECT_TRUE(contains(names<ALL>("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1"), "e8c8"));
    EXPECT_FALSE(contains(names<CAPTURES>("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"), "e1g1"));
}

// the split is only useful if the two halves add back up to the whole
TEST(MoveGen, CapturesPlusQuietsIsEverything) {
    const std::vector<std::string_view> fens = {
        START_FEN,
        "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
        "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
        "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
        "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
        "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
    };

    for (const std::string_view fen : fens) {
        std::vector<std::string> split        = names<CAPTURES>(fen);
        const std::vector<std::string> quiets = names<QUIETS>(fen);
        split.insert(split.end(), quiets.begin(), quiets.end());
        std::ranges::sort(split);

        EXPECT_EQ(split, names<ALL>(fen)) << fen;
    }
}
