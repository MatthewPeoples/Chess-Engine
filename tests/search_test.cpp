// The search has to find the obvious things, and it has to keep playing legal moves for a whole
// game without help.

#include "search.hpp"

#include <algorithm>
#include <string_view>

#include <gtest/gtest.h>

#include "movegen.hpp"

using namespace chess;

namespace {

Position parse(std::string_view fen) {
    const auto pos = Position::from_fen(fen);
    EXPECT_TRUE(pos.has_value()) << fen;
    return pos.value_or(Position::start());
}

Result search_to(Position& pos, int depth) {
    Limits limits;
    limits.depth = depth;
    return search(pos, limits, nullptr);
}

bool is_legal(Position& pos, Move m) {
    MoveList list;
    generate_legal(pos, list);

    return std::ranges::any_of(list, [m](const Move legal) { return legal == m; });
}

}  // namespace

TEST(Search, FindsMateInOne) {
    Position pos = parse("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1");

    const Result result = search_to(pos, 3);
    EXPECT_EQ(move_name(result.best), "a1a8");
    EXPECT_GT(result.score, MATE_SCORE - MAX_PLY);
}

TEST(Search, TakesTheFreeQueen) {
    Position pos = parse("4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1");

    EXPECT_EQ(move_name(search_to(pos, 4).best), "d1d5");
}

TEST(Search, AvoidsHangingItsOwnQueen) {
    // the queen is attacked by the rook, and taking it loses the queen to the king
    Position pos = parse("4k3/8/8/8/8/3q4/8/3RK3 b - - 0 1");

    const Result result = search_to(pos, 4);
    EXPECT_NE(move_name(result.best), "d3d1");
    EXPECT_EQ(result.best.from_sq(), SQ_D3);
    EXPECT_TRUE(is_legal(pos, result.best));
}

TEST(Search, ReportsAMateScoreAsADistance) {
    Position pos = parse("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1");

    // mate in one is one move away, whatever depth it was found at
    EXPECT_EQ((MATE_SCORE - search_to(pos, 4).score + 1) / 2, 1);
}

// nothing here checks how well it plays, only that it never picks an illegal move and the game ends
TEST(Search, PlaysAWholeGameAgainstItself) {
    Position pos = Position::start();

    int ply = 0;
    for (; ply < 120; ++ply) {
        MoveList list;
        generate_legal(pos, list);
        if (list.size() == 0 || pos.rule50_count() >= 100) {
            break;
        }

        const Result result = search_to(pos, 3);
        ASSERT_TRUE(is_legal(pos, result.best)) << "ply " << ply << ": " << move_name(result.best);
        pos.do_move(result.best);
    }

    EXPECT_GT(ply, 10);  // it should not have run out of legal moves immediately
}
