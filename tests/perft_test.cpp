// The correctness gate. Node counts from the Chess Programming Wiki, and the legality cases
// that perft catches but that are quicker to debug on their own.

#include "perft.hpp"

#include <algorithm>
#include <string>
#include <string_view>
#include <vector>

#include <gtest/gtest.h>

#include "movegen.hpp"

using namespace chess;

namespace {

Position parse(std::string_view fen) {
    const auto pos = Position::from_fen(fen);
    EXPECT_TRUE(pos.has_value()) << fen;
    return pos.value_or(Position::start());
}

std::vector<std::string> legal_names(std::string_view fen) {
    Position pos = parse(fen);

    MoveList list;
    generate_legal(pos, list);

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

// the reference version: no shortcut at depth 1, every move made and taken back
std::uint64_t perft_plain(Position& pos, int depth) {
    if (depth <= 0) {
        return 1;
    }

    MoveList list;
    generate_legal(pos, list);

    std::uint64_t nodes = 0;
    for (const Move m : list) {
        const Undo undo = pos.do_move(m);
        nodes += perft_plain(pos, depth - 1);
        pos.undo_move(undo);
    }
    return nodes;
}

}  // namespace

TEST(Perft, StartPosition) {
    Position pos = parse(START_FEN);

    EXPECT_EQ(perft(pos, 1), 20U);
    EXPECT_EQ(perft(pos, 2), 400U);
    EXPECT_EQ(perft(pos, 3), 8902U);
    EXPECT_EQ(perft(pos, 4), 197281U);
}

TEST(Perft, Kiwipete) {
    Position pos = parse("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");

    EXPECT_EQ(perft(pos, 1), 48U);
    EXPECT_EQ(perft(pos, 2), 2039U);
    EXPECT_EQ(perft(pos, 3), 97862U);
    EXPECT_EQ(perft(pos, 4), 4085603U);
}

TEST(Perft, Position3) {
    Position pos = parse("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1");

    EXPECT_EQ(perft(pos, 1), 14U);
    EXPECT_EQ(perft(pos, 2), 191U);
    EXPECT_EQ(perft(pos, 3), 2812U);
    EXPECT_EQ(perft(pos, 4), 43238U);
    EXPECT_EQ(perft(pos, 5), 674624U);
}

TEST(Perft, Position4) {
    Position pos = parse("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1");

    EXPECT_EQ(perft(pos, 1), 6U);
    EXPECT_EQ(perft(pos, 2), 264U);
    EXPECT_EQ(perft(pos, 3), 9467U);
    EXPECT_EQ(perft(pos, 4), 422333U);
}

// the same position with the colours swapped: a difference here is a colour-specific bug
TEST(Perft, Position4Mirrored) {
    Position pos = parse("r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1");

    EXPECT_EQ(perft(pos, 3), 9467U);
    EXPECT_EQ(perft(pos, 4), 422333U);
}

TEST(Perft, Position5) {
    Position pos = parse("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8");

    EXPECT_EQ(perft(pos, 1), 44U);
    EXPECT_EQ(perft(pos, 2), 1486U);
    EXPECT_EQ(perft(pos, 3), 62379U);
    EXPECT_EQ(perft(pos, 4), 2103487U);
}

TEST(Perft, Position6) {
    Position pos = parse("r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10");

    EXPECT_EQ(perft(pos, 1), 46U);
    EXPECT_EQ(perft(pos, 2), 2079U);
    EXPECT_EQ(perft(pos, 3), 89890U);
    EXPECT_EQ(perft(pos, 4), 3894594U);
}

// the depth 1 shortcut has to agree with making every move
TEST(Perft, ShortcutMatchesTheReferenceVersion) {
    for (const std::string_view fen :
         {START_FEN, std::string_view("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1")}) {
        Position pos = parse(fen);
        for (int depth = 1; depth <= 3; ++depth) {
            EXPECT_EQ(perft(pos, depth), perft_plain(pos, depth)) << fen << " depth " << depth;
        }
    }
}

TEST(Legality, StartPositionHasTwentyLegalMoves) {
    EXPECT_EQ(legal_names(START_FEN).size(), 20U);
}

TEST(Legality, APinnedPieceCannotMove) {
    // the knight on e2 is pinned to the king by the rook on e8
    const auto moves = legal_names("4r2k/8/8/8/8/8/4N3/4K3 w - - 0 1");

    EXPECT_FALSE(contains(moves, "e2c3"));
    EXPECT_FALSE(contains(moves, "e2g3"));
    EXPECT_TRUE(contains(moves, "e1d1"));
}

TEST(Legality, TheKingCannotStepBackwardsAlongTheRay) {
    // checked down the d-file: d2 is still on the file once the king has moved
    const auto moves = legal_names("3r3k/8/8/8/8/8/8/3K4 w - - 0 1");

    EXPECT_FALSE(contains(moves, "d1d2"));
    EXPECT_TRUE(contains(moves, "d1c2"));
    EXPECT_TRUE(contains(moves, "d1e2"));
}

TEST(Legality, CastlingRulesAboutCheck) {
    // the rook on f8 attacks f1, which the king would cross
    const auto crossing = legal_names("5r2/4k3/8/8/8/8/8/R3K2R w KQ - 0 1");
    EXPECT_FALSE(contains(crossing, "e1g1"));
    EXPECT_TRUE(contains(crossing, "e1c1"));

    // in check, so neither castle is available
    const auto inCheck = legal_names("4r3/6k1/8/8/8/8/8/R3K2R w KQ - 0 1");
    EXPECT_FALSE(contains(inCheck, "e1g1"));
    EXPECT_FALSE(contains(inCheck, "e1c1"));

    // b1 attacked is fine: the king never crosses it
    const auto bFile = legal_names("1r2k3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
    EXPECT_TRUE(contains(bFile, "e1c1"));
}

// both pawns leave the rank at once, which would expose the king to the queen on h4
TEST(Legality, TheEnPassantPin) {
    const auto moves = legal_names("8/8/8/8/k2Pp2Q/8/8/3K4 b - d3 0 1");

    EXPECT_FALSE(contains(moves, "e4d3"));
    EXPECT_TRUE(contains(moves, "e4e3"));
}
