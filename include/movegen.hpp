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

// the pseudo-legal moves that do not leave your own king attacked
// takes a mutable position because it plays each move to find out, then takes it back
void generate_legal(Position& pos, MoveList& list);

}  // namespace chess
