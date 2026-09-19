#pragma once

#include <array>
#include <iosfwd>

#include "types.hpp"

// attack sets for the pieces that dont slide: knights, kings and pawn captures
// these only depend on the square, so all 64 answers are worked out at compile time

namespace chess {

// --- File masks ---
// a shift doesnt know the board has edges, so the file that would wrap is masked off first
inline constexpr Bitboard FILE_A_BB = 0x0101010101010101ULL;
inline constexpr Bitboard FILE_H_BB = FILE_A_BB << 7;

// --- Shifts ---
// north is +8 because a rank is 8 squares; east is +1 and loses the h-file

constexpr Bitboard shift_north(Bitboard bb) {
    return bb << 8;
}

constexpr Bitboard shift_south(Bitboard bb) {
    return bb >> 8;
}

constexpr Bitboard shift_east(Bitboard bb) {
    return (bb & ~FILE_H_BB) << 1;
}

constexpr Bitboard shift_west(Bitboard bb) {
    return (bb & ~FILE_A_BB) >> 1;
}

constexpr Bitboard shift_north_east(Bitboard bb) {
    return (bb & ~FILE_H_BB) << 9;
}

constexpr Bitboard shift_north_west(Bitboard bb) {
    return (bb & ~FILE_A_BB) << 7;
}

constexpr Bitboard shift_south_east(Bitboard bb) {
    return (bb & ~FILE_H_BB) >> 7;
}

constexpr Bitboard shift_south_west(Bitboard bb) {
    return (bb & ~FILE_A_BB) >> 9;
}

// detail marks what is here to build the tables rather than to be called
namespace detail {

// clang-format off
// a knight move is two squares one way and one the other, so every target is two shifts away
constexpr Bitboard knight_from(Bitboard bb) {
    return shift_north(shift_north_east(bb)) 
         | shift_north(shift_north_west(bb)) 
         | shift_south(shift_south_east(bb))
         | shift_south(shift_south_west(bb)) 
         | shift_east(shift_north_east(bb)) 
         | shift_east(shift_south_east(bb))
         | shift_west(shift_north_west(bb)) 
         | shift_west(shift_south_west(bb));
}

constexpr Bitboard king_from(Bitboard bb) {
    return shift_north(bb) 
         | shift_south(bb) 
         | shift_east(bb) 
         | shift_west(bb) 
         | shift_north_east(bb)
         | shift_north_west(bb) 
         | shift_south_east(bb) 
         | shift_south_west(bb);
}
// clang-format on

// captures only, so the pushes are not in here
constexpr Bitboard pawn_from(Colour c, Bitboard bb) {
    return c == WHITE ? shift_north_east(bb) | shift_north_west(bb) : shift_south_east(bb) | shift_south_west(bb);
}

// all possible knight moves
constexpr std::array<Bitboard, SQUARE_NB> knight_table() {
    std::array<Bitboard, SQUARE_NB> table{};
    for (int sq = SQ_A1; sq <= SQ_H8; ++sq) {
        table[sq] = knight_from(square_bb(Square(sq)));
    }
    return table;
}

// all possible king moves
constexpr std::array<Bitboard, SQUARE_NB> king_table() {
    std::array<Bitboard, SQUARE_NB> table{};
    for (int sq = SQ_A1; sq <= SQ_H8; ++sq) {
        table[sq] = king_from(square_bb(Square(sq)));
    }
    return table;
}

// all possible pawn attack moves
constexpr std::array<std::array<Bitboard, SQUARE_NB>, COLOUR_NB> pawn_table() {
    std::array<std::array<Bitboard, SQUARE_NB>, COLOUR_NB> table{};
    for (int c = WHITE; c < COLOUR_NB; ++c) {
        for (int sq = SQ_A1; sq <= SQ_H8; ++sq) {
            table[c][sq] = pawn_from(Colour(c), square_bb(Square(sq)));
        }
    }
    return table;
}

}  // namespace detail

// --- Attack tables ---
// built on compile, so all moves built in already

inline constexpr std::array<Bitboard, SQUARE_NB> KNIGHT_ATTACKS                      = detail::knight_table();
inline constexpr std::array<Bitboard, SQUARE_NB> KING_ATTACKS                        = detail::king_table();
inline constexpr std::array<std::array<Bitboard, SQUARE_NB>, COLOUR_NB> PAWN_ATTACKS = detail::pawn_table();

constexpr Bitboard knight_attacks(Square sq) {
    assert(is_ok(sq));
    return KNIGHT_ATTACKS[sq];
}

constexpr Bitboard king_attacks(Square sq) {
    assert(is_ok(sq));
    return KING_ATTACKS[sq];
}

// the squares this pawn could capture on, empty or not
constexpr Bitboard pawn_attacks(Colour c, Square sq) {
    assert(is_ok(sq));
    return PAWN_ATTACKS[c][sq];
}

// --- Sliding attacks ---
// These depend on what is in the way, each ray is walked one square at a time

namespace detail {

// walks outward until the board runs out or a piece is hit
constexpr Bitboard ray(Square sq, Bitboard occupied, Bitboard (*step)(Bitboard)) {
    Bitboard attacks = 0;
    Bitboard walk    = step(square_bb(sq));

    while (walk != 0) {
        attacks |= walk;
        if ((walk & occupied) != 0) {
            break;
        }
        walk = step(walk);
    }
    return attacks;
}

}  // namespace detail

// clang-format off
// all possible rook moves
constexpr Bitboard rook_attacks(Square sq, Bitboard occupied) {
    return detail::ray(sq, occupied, shift_north)
         | detail::ray(sq, occupied, shift_south)
         | detail::ray(sq, occupied, shift_east)
         | detail::ray(sq, occupied, shift_west);
}

// all possible bishop moves
constexpr Bitboard bishop_attacks(Square sq, Bitboard occupied) {
    return detail::ray(sq, occupied, shift_north_east)
         | detail::ray(sq, occupied, shift_north_west)
         | detail::ray(sq, occupied, shift_south_east)
         | detail::ray(sq, occupied, shift_south_west);
}
// clang-format on

// all possible queen moves, combination of rook and bishop
constexpr Bitboard queen_attacks(Square sq, Bitboard occupied) {
    return rook_attacks(sq, occupied) | bishop_attacks(sq, occupied);
}

// same layout as the board printer, x for a set bit
void print(Bitboard bb, std::ostream& os);

}  // namespace chess
