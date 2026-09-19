#include "move.hpp"

#include <string_view>

namespace chess {

namespace {

// indexed by promotion_piece() - KNIGHT
constexpr std::string_view PROMOTION_TO_CHAR = "nbrq";

}  // namespace

std::string square_name(Square sq) {
    assert(is_ok(sq));
    return {static_cast<char>('a' + file_of(sq)), static_cast<char>('1' + rank_of(sq))};
}

std::string move_name(Move m) {
    std::string out = square_name(m.from_sq()) + square_name(m.to_sq());
    if (m.type() == PROMOTION) {
        out += PROMOTION_TO_CHAR[m.promotion_piece() - KNIGHT];
    }
    return out;
}

}  // namespace chess
