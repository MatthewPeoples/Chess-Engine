#pragma once

#include <array>
#include <iosfwd>
#include <optional>
#include <string>
#include <string_view>

#include "types.hpp"

// The board: what stands on every square, whose turn it is, and the FEN text conversions

namespace chess {

// inline means every file that includes this header shares one copy of the constant
inline constexpr std::string_view START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

class Position {
  public:
    // --- Building a position ---

    // the opening position, hardcoded, so FEN has something known to be checked against
    static Position start();

    // empty if the FEN is broken
    [[nodiscard]] static std::optional<Position> from_fen(std::string_view fen);

    // the same position written back out as FEN text
    std::string fen() const;

    bool operator==(const Position&) const = default;

    // --- Where the pieces are ---
    Bitboard pieces() const;
    Bitboard pieces(Colour c) const;
    Bitboard pieces(PieceType pt) const;
    Bitboard pieces(Colour c, PieceType pt) const;
    Piece piece_on(Square sq) const;

    // --- The rest of the position ---
    Colour side_to_move() const;
    CastlingRights castling_rights() const;
    // en passant squares, calculated regardless if there's a valid move to take the pawn or not
    Square ep_square() const;
    // 50 moves without a capture or pawn move results in a draw
    int rule50_count() const;
    // increments after every black move
    int fullmove_number() const;

  private:
    void put_piece(Piece pc, Square sq);

    // --- Data ---
    std::array<Piece, SQUARE_NB> board{};            // square -> piece
    std::array<Bitboard, PIECE_TYPE_NB> byTypeBB{};  // piece type -> squares
    std::array<Bitboard, COLOUR_NB> byColourBB{};    // colour -> squares

    Colour sideToMove             = WHITE;
    CastlingRights castlingRights = NO_CASTLING;
    Square epSquare               = SQ_NONE;
    int rule50                    = 0;
    int fullmoveNumber            = 1;
};

// writes the board and state to any stream: std::cout from main, a string stream from the tests
void print(const Position& pos, std::ostream& os);

}  // namespace chess
