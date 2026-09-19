#pragma once

#include <cassert>
#include <cstdint>

// colours, pieces, squares, and the conversions between them
// This file doesnt know what chess is

namespace chess {

// --- Bitboards ---
// One 64-bit number, one bit per square: bit 0 is a1, bit 63 is h8
using Bitboard = std::uint64_t;

// --- Colours and castling rights ---
enum Colour : std::uint8_t { WHITE, BLACK, COLOUR_NB = 2 };

// One bit per right, so a whole set fits in one value: KQkq is 15, KQ on its own is 3.
enum CastlingRights : std::uint8_t {
    NO_CASTLING,
    WHITE_OO,
    WHITE_OOO    = WHITE_OO << 1,
    BLACK_OO     = WHITE_OO << 2,
    BLACK_OOO    = WHITE_OO << 3,
    ANY_CASTLING = WHITE_OO | WHITE_OOO | BLACK_OO | BLACK_OOO,
};

// --- Pieces ---
//
// clang-format off
// Slot 0 is not a real piece type, which leaves byTypeBB[ALL_PIECES] free to hold every occupied square 
// PIECE_TYPE_NB is 8 rather than 7 so a piece type always fits in three bits
enum PieceType : std::uint8_t {
    NO_PIECE_TYPE, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
    ALL_PIECES = 0,
    PIECE_TYPE_NB = 8
};

// piece = colour * 8 + type, so W_KNIGHT is 2 and B_KNIGHT is 10.
enum Piece : std::uint8_t {
    NO_PIECE,
    W_PAWN = PAWN,     W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,
    B_PAWN = PAWN + 8, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING,
    PIECE_NB = 16
};

// --- Squares, files and ranks ---
//
// LERF, the fixed decision for this engine: 
// a1 = 0, b1 = 1, and so on up to h8 = 63, so square = rank * 8 + file 
// SQ_NONE marks "no square", which is what an absent en passant square holds
enum Square : std::uint8_t {
    SQ_A1, SQ_B1, SQ_C1, SQ_D1, SQ_E1, SQ_F1, SQ_G1, SQ_H1,
    SQ_A2, SQ_B2, SQ_C2, SQ_D2, SQ_E2, SQ_F2, SQ_G2, SQ_H2,
    SQ_A3, SQ_B3, SQ_C3, SQ_D3, SQ_E3, SQ_F3, SQ_G3, SQ_H3,
    SQ_A4, SQ_B4, SQ_C4, SQ_D4, SQ_E4, SQ_F4, SQ_G4, SQ_H4,
    SQ_A5, SQ_B5, SQ_C5, SQ_D5, SQ_E5, SQ_F5, SQ_G5, SQ_H5,
    SQ_A6, SQ_B6, SQ_C6, SQ_D6, SQ_E6, SQ_F6, SQ_G6, SQ_H6,
    SQ_A7, SQ_B7, SQ_C7, SQ_D7, SQ_E7, SQ_F7, SQ_G7, SQ_H7,
    SQ_A8, SQ_B8, SQ_C8, SQ_D8, SQ_E8, SQ_F8, SQ_G8, SQ_H8,
    SQ_NONE,
    SQUARE_NB = 64
};
// clang-format on

enum File : std::uint8_t { FILE_A, FILE_B, FILE_C, FILE_D, FILE_E, FILE_F, FILE_G, FILE_H, FILE_NB };
enum Rank : std::uint8_t { RANK_1, RANK_2, RANK_3, RANK_4, RANK_5, RANK_6, RANK_7, RANK_8, RANK_NB };

// --- Conversions ---
// false for SQ_NONE and for anything past the board
constexpr bool is_ok(Square sq) {
    return sq <= SQ_H8;
}

constexpr Square make_square(File f, Rank r) {
    return Square((r << 3) + f);
}

constexpr File file_of(Square sq) {
    return File(sq & 7);
}

constexpr Rank rank_of(Square sq) {
    return Rank(sq >> 3);
}

constexpr Piece make_piece(Colour c, PieceType pt) {
    return Piece((c << 3) + pt);
}

constexpr PieceType type_of(Piece pc) {
    return PieceType(pc & 7);
}

constexpr Colour colour_of(Piece pc) {
    assert(pc != NO_PIECE);  // NO_PIECE would come back WHITE, which is never what the caller meant
    return Colour(pc >> 3);
}

// One square as a bitboard: square_bb(SQ_E4) is bit 28 set, 0x0000000010000000.
// Shifting by 64 is undefined and usually wraps round to a1, so SQ_NONE would silently become a1
constexpr Bitboard square_bb(Square sq) {
    assert(is_ok(sq));
    return Bitboard{1} << sq;
}

}  // namespace chess