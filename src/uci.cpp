#include "uci.hpp"

#ifndef CHESS_VERSION
#define CHESS_VERSION "dev"  // set by CMake from git describe
#endif

#include <array>
#include <charconv>
#include <chrono>
#include <istream>
#include <optional>
#include <ostream>
#include <sstream>
#include <string>
#include <vector>

#include "eval.hpp"
#include "movegen.hpp"
#include "perft.hpp"
#include "search.hpp"

namespace chess {

namespace {

std::vector<std::string> split(const std::string& line) {
    std::istringstream stream(line);
    std::vector<std::string> out;

    std::string word;
    while (stream >> word) {
        out.push_back(word);
    }
    return out;
}

int number_after(const std::vector<std::string>& words, std::string_view name, int fallback) {
    for (std::size_t i = 0; i + 1 < words.size(); ++i) {
        if (words[i] != name) {
            continue;
        }

        int value              = fallback;
        const std::string& arg = words[i + 1];
        if (std::from_chars(arg.data(), arg.data() + arg.size(), value).ec == std::errc{}) {
            return value;
        }
    }
    return fallback;
}

bool has_word(const std::vector<std::string>& words, std::string_view name) {
    return std::ranges::find(words, name) != words.end();
}

// the GUI sends moves as text, so they are matched against the moves that are actually legal
std::optional<Move> find_move(Position& pos, std::string_view name) {
    MoveList list;
    generate_legal(pos, list);

    for (const Move m : list) {
        if (move_name(m) == name) {
            return m;
        }
    }
    return std::nullopt;
}

// position startpos [moves ...] | position fen <six fields> [moves ...]
void handle_position(Position& pos, const std::vector<std::string>& words) {
    std::size_t index = 2;

    if (words.size() > 1 && words[1] == "fen") {
        std::string fen;
        for (index = 2; index < words.size() && words[index] != "moves"; ++index) {
            fen += words[index];
            fen += ' ';
        }

        const auto parsed = Position::from_fen(fen);
        if (!parsed.has_value()) {
            return;
        }
        pos = *parsed;
    } else {
        pos = Position::start();
    }

    while (index < words.size() && words[index] != "moves") {
        ++index;
    }
    for (++index; index < words.size(); ++index) {
        const auto m = find_move(pos, words[index]);
        if (!m.has_value()) {
            return;
        }
        pos.do_move(*m);
    }
}

Limits limits_from(const std::vector<std::string>& words) {
    Limits limits;

    limits.infinite    = has_word(words, "infinite");
    limits.movetime    = number_after(words, "movetime", 0);
    limits.time[WHITE] = number_after(words, "wtime", 0);
    limits.time[BLACK] = number_after(words, "btime", 0);
    limits.inc[WHITE]  = number_after(words, "winc", 0);
    limits.inc[BLACK]  = number_after(words, "binc", 0);
    limits.depth       = number_after(words, "depth", MAX_PLY);

    // a bare go with no clock and no depth would search forever, so it gets a sane default
    const bool timed = limits.infinite || limits.movetime > 0 || limits.time[WHITE] > 0 || limits.time[BLACK] > 0;
    if (!timed && !has_word(words, "depth")) {
        limits.depth = 8;
    }
    return limits;
}

void handle_go(Position& pos, const std::vector<std::string>& words, std::ostream& out) {
    const Result result = search(pos, limits_from(words), &out);

    // 0000 is what a GUI expects when there is nothing to play
    out << "bestmove " << (result.best == Move() ? "0000" : move_name(result.best)) << '\n' << std::flush;
}

// A fixed set of positions at a fixed depth. Same work every time, so the nodes per second it
// prints can be compared between versions - which is a different question from playing strength.
void handle_bench(std::ostream& out) {
    constexpr int depth                                  = 6;
    constexpr std::array<std::string_view, 12> positions = {
        START_FEN,
        "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
        "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
        "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
        "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
        "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10",
        "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        "r2q1rk1/pp2bppp/2n1bn2/2pp4/3P4/2P1PN2/PP1NBPPP/R1BQ1RK1 w - - 0 10",
        "8/5pk1/6p1/7p/3R3P/5PK1/r5P1/8 w - - 0 40",
        "2kr3r/ppp2ppp/2n1b3/4q3/3P4/2P1B3/PP3PPP/R2Q1RK1 w - - 0 15",
        "8/8/4k3/8/2p5/8/B2P2K1/8 w - - 0 1",
        "5rk1/1ppb3p/p1pb4/6q1/3P1p1r/2P1R2P/PP1BQ1P1/5RKN w - - 0 1",
    };

    std::uint64_t nodes = 0;
    const auto started  = std::chrono::steady_clock::now();

    for (const std::string_view fen : positions) {
        auto parsed = Position::from_fen(fen);
        if (!parsed.has_value()) {
            continue;
        }

        Limits limits;
        limits.depth = depth;
        nodes += search(*parsed, limits, nullptr).nodes;
    }

    const auto ms =
        std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - started).count();
    const std::uint64_t nps = ms > 0 ? nodes * 1000 / static_cast<std::uint64_t>(ms) : nodes;

    out << "bench nodes " << nodes << " time " << ms << " nps " << nps << " depth " << depth << '\n' << std::flush;
}

}  // namespace

void uci_loop(std::istream& in, std::ostream& out) {
    Position pos = Position::start();

    std::string line;
    while (std::getline(in, line)) {
        const std::vector<std::string> words = split(line);
        if (words.empty()) {
            continue;
        }
        const std::string& command = words[0];

        if (command == "uci") {
            out << "id name Chess-Engine " << CHESS_VERSION << "\nid author Matthew Peoples\nuciok\n" << std::flush;
        } else if (command == "isready") {
            out << "readyok\n" << std::flush;
        } else if (command == "ucinewgame") {
            pos = Position::start();
        } else if (command == "position") {
            handle_position(pos, words);
        } else if (command == "go") {
            handle_go(pos, words, out);
        } else if (command == "d") {
            print(pos, out);
            out << "\nfen: " << pos.fen() << "\neval: " << evaluate(pos) << '\n' << std::flush;
        } else if (command == "bench") {
            handle_bench(out);
        } else if (command == "perft") {
            perft_divide(pos, number_after(words, "perft", 1), out);
        } else if (command == "quit") {
            return;
        }
        // stop and anything else is ignored: the search always returns inside its own time budget
    }
}

}  // namespace chess
