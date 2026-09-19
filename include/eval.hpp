#pragma once

#include "position.hpp"

// a number saying how good a position is, in centipawns, from the point of view of the side to move

namespace chess {

// the usual starting set: a bishop worth a shade more than a knight, a queen worth two rooks
constexpr int piece_value(PieceType pt) {
    switch (pt) {
    case PAWN:
        return 100;
    case KNIGHT:
        return 320;
    case BISHOP:
        return 330;
    case ROOK:
        return 500;
    case QUEEN:
        return 900;
    default:
        return 0;  // the king is never counted, it is always on the board
    }
}

int evaluate(const Position& pos);

}  // namespace chess
