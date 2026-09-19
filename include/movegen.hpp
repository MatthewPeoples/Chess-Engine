#pragma once

#include <cstdint>

#include "move.hpp"
#include "position.hpp"

// every move the pieces can make by their own movement rules

namespace chess {

// which squares a move is allowed to land on
enum GenType : std::uint8_t {
    CAPTURES,
    QUIETS,
    ALL,
};

// appends, so CAPTURES then QUIETS into one list gives the same set as ALL
template <GenType T> void generate(const Position& pos, MoveList& list);

}  // namespace chess
