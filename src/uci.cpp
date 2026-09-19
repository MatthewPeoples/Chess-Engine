#include "uci.hpp"

#include <charconv>
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
        } else if (command == "perft") {
            perft_divide(pos, number_after(words, "perft", 1), out);
        } else if (command == "quit") {
            return;
        }
        // stop and anything else is ignored: the search always returns inside its own time budget
    }
}

}  // namespace chess
