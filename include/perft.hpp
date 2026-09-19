#pragma once

#include <cstdint>
#include <iosfwd>

#include "position.hpp"

// counting leaf nodes to a fixed depth, which is how a move generator is proved right

namespace chess {

std::uint64_t perft(Position& pos, int depth);

// node count per first move, so a wrong total can be bisected down to the move causing it
std::uint64_t perft_divide(Position& pos, int depth, std::ostream& os);

}  // namespace chess
