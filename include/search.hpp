#pragma once

#include <array>
#include <cstdint>
#include <iosfwd>

#include "move.hpp"
#include "position.hpp"

// alpha-beta search with iterative deepening: the part that actually picks a move

namespace chess {

inline constexpr int MAX_PLY = 64;

// scores at or beyond this are a forced mate, counted in plies from the root
inline constexpr int MATE_SCORE = 30000;

struct Limits {
    int depth    = MAX_PLY;
    int movetime = 0;  // milliseconds for this move, 0 if the clock is being used instead
    std::array<int, COLOUR_NB> time{};
    std::array<int, COLOUR_NB> inc{};
    bool infinite = false;
};

struct Result {
    Move best;
    int score           = 0;
    int depth           = 0;
    std::uint64_t nodes = 0;
};

// info lines are written to info if it is given, which is how a GUI follows the search
Result search(Position& pos, const Limits& limits, std::ostream* info = nullptr);

}  // namespace chess
