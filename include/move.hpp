#pragma once

#include <array>
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <string>

#include "types.hpp"

// a move packed into 16 bits, and a fixed size list to hold a position's worth of them

namespace chess {

// bits 0-5 to, bits 6-11 from, bits 12-13 promotion piece, bits 14-15 move type
enum MoveType : std::uint16_t {
    NORMAL,
    PROMOTION  = 1 << 14,
    EN_PASSANT = 2 << 14,
    CASTLING   = 3 << 14,
};

class Move {
  public:
    Move() = default;

    constexpr Move(Square from, Square to) : data(pack(from, to, NORMAL, KNIGHT)) {}

    static constexpr Move promotion(Square from, Square to, PieceType pt) {
        assert(pt >= KNIGHT && pt <= QUEEN);
        return Move(pack(from, to, PROMOTION, pt));
    }

    static constexpr Move en_passant(Square from, Square to) {
        return Move(pack(from, to, EN_PASSANT, KNIGHT));
    }

    // the king's two square move, which is what UCI expects (except chess960)
    // TODO: consider chess960 in the future
    static constexpr Move castling(Square from, Square to) {
        return Move(pack(from, to, CASTLING, KNIGHT));
    }

    constexpr Square from_sq() const {
        return Square((data >> 6) & 0x3F);
    }

    constexpr Square to_sq() const {
        return Square(data & 0x3F);
    }

    constexpr MoveType type() const {
        return MoveType(data & (3 << 14));
    }

    // only means anything when type() is PROMOTION
    constexpr PieceType promotion_piece() const {
        return PieceType(((data >> 12) & 3) + KNIGHT);
    }

    constexpr std::uint16_t raw() const {
        return data;
    }

    constexpr bool operator==(const Move&) const = default;

  private:
    explicit constexpr Move(std::uint16_t bits) : data(bits) {}

    static constexpr std::uint16_t pack(Square from, Square to, MoveType type, PieceType pt) {
        return static_cast<std::uint16_t>(type | ((pt - KNIGHT) << 12) | (from << 6) | to);
    }

    std::uint16_t data = 0;
};

// the whole point of the packing
static_assert(sizeof(Move) == 2);

// 218 is the most anyone has found in a legal position, so 256 leaves room
inline constexpr std::size_t MAX_MOVES = 256;

class MoveList {
  public:
    void add(Move m) {
        assert(count < MAX_MOVES);
        moves[count++] = m;
    }

    constexpr std::size_t size() const {
        return count;
    }

    constexpr Move operator[](std::size_t i) const {
        assert(i < count);
        return moves[i];
    }

    constexpr const Move* begin() const {
        return moves.data();
    }

    constexpr const Move* end() const {
        return moves.data() + count;
    }

  private:
    std::array<Move, MAX_MOVES> moves{};
    std::size_t count = 0;
};

// "e2", "h8"
std::string square_name(Square sq);

// long algebraic, the notation UCI speaks: e2e4, e7e8q
std::string move_name(Move m);

}  // namespace chess
