// The protocol side: what a GUI sends, and what it expects back.

#include "uci.hpp"

#include <sstream>
#include <string>

#include <gtest/gtest.h>

namespace {

std::string talk(const std::string& commands) {
    std::istringstream in(commands);
    std::ostringstream out;
    chess::uci_loop(in, out);
    return out.str();
}

bool says(const std::string& output, const std::string& text) {
    return output.find(text) != std::string::npos;
}

}  // namespace

TEST(Uci, Handshake) {
    const std::string out = talk("uci\nisready\nquit\n");

    EXPECT_TRUE(says(out, "id name"));
    EXPECT_TRUE(says(out, "uciok"));
    EXPECT_TRUE(says(out, "readyok"));
}

TEST(Uci, SearchesAndReturnsABestMove) {
    const std::string out = talk("position startpos\ngo depth 3\nquit\n");

    EXPECT_TRUE(says(out, "info depth 1"));
    EXPECT_TRUE(says(out, "info depth 3"));
    EXPECT_TRUE(says(out, "bestmove "));
}

TEST(Uci, AppliesTheMovesTheGuiSends) {
    const std::string out = talk("position startpos moves e2e4 e7e5 g1f3\nd\nquit\n");

    EXPECT_TRUE(says(out, "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"));
}

TEST(Uci, AcceptsAFenPosition) {
    const std::string out = talk("position fen 6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1\ngo depth 3\nquit\n");

    EXPECT_TRUE(says(out, "bestmove a1a8"));  // mate in one
}

TEST(Uci, RespectsAMovetimeBudget) {
    const std::string out = talk("position startpos\ngo movetime 200\nquit\n");

    EXPECT_TRUE(says(out, "bestmove "));
}

TEST(Uci, PerftCommand) {
    const std::string out = talk("position startpos\nperft 3\nquit\n");

    EXPECT_TRUE(says(out, "nodes: 8902"));
}
