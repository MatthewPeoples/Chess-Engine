// The opening position, square by square and bitboard by bitboard, plus the check that
// the array and the bitboards still agree, and the printed board.

#include "position.hpp"

#include <array>
#include <sstream>
#include <string>

#include <gtest/gtest.h>

using namespace chess;

TEST(Position, StartBitboards) {
    const Position pos = Position::start();

    EXPECT_EQ(pos.pieces(), 0xFFFF00000000FFFFULL);
    EXPECT_EQ(pos.pieces(WHITE), 0x000000000000FFFFULL);
    EXPECT_EQ(pos.pieces(BLACK), 0xFFFF000000000000ULL);
    EXPECT_EQ(pos.pieces(PAWN), 0x00FF00000000FF00ULL);
    EXPECT_EQ(pos.pieces(WHITE, PAWN), 0x000000000000FF00ULL);
    EXPECT_EQ(pos.pieces(WHITE, ROOK), 0x0000000000000081ULL);
    EXPECT_EQ(pos.pieces(BLACK, KNIGHT), 0x4200000000000000ULL);
    EXPECT_EQ(pos.pieces(BLACK, KING), 0x1000000000000000ULL);
}

TEST(Position, StartSquares) {
    const Position pos = Position::start();

    EXPECT_EQ(pos.piece_on(SQ_A1), W_ROOK);
    EXPECT_EQ(pos.piece_on(SQ_D1), W_QUEEN);
    EXPECT_EQ(pos.piece_on(SQ_E1), W_KING);
    EXPECT_EQ(pos.piece_on(SQ_E2), W_PAWN);
    EXPECT_EQ(pos.piece_on(SQ_E4), NO_PIECE);
    EXPECT_EQ(pos.piece_on(SQ_E8), B_KING);
    EXPECT_EQ(pos.piece_on(SQ_G8), B_KNIGHT);
}

TEST(Position, StartState) {
    const Position pos = Position::start();

    EXPECT_EQ(pos.side_to_move(), WHITE);
    EXPECT_EQ(pos.castling_rights(), ANY_CASTLING);
    EXPECT_EQ(pos.ep_square(), SQ_NONE);
    EXPECT_EQ(pos.rule50_count(), 0);
    EXPECT_EQ(pos.fullmove_number(), 1);
}

// rebuild every bitboard from piece_on() alone and check it matches what Position stored
TEST(Position, BoardMatchesBitboards) {
    const Position pos = Position::start();

    std::array<Bitboard, PIECE_TYPE_NB> byType{};
    std::array<Bitboard, COLOUR_NB> byColour{};
    for (int i = SQ_A1; i <= SQ_H8; ++i) {
        const auto sq  = Square(i);
        const Piece pc = pos.piece_on(sq);
        if (pc == NO_PIECE) {
            continue;
        }
        byType[ALL_PIECES] |= square_bb(sq);
        byType[type_of(pc)] |= square_bb(sq);
        byColour[colour_of(pc)] |= square_bb(sq);
    }

    EXPECT_EQ(pos.pieces(), byType[ALL_PIECES]);
    for (PieceType pt : {PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING}) {
        EXPECT_EQ(pos.pieces(pt), byType[pt]);
    }
    for (Colour c : {WHITE, BLACK}) {
        EXPECT_EQ(pos.pieces(c), byColour[c]);
    }
}

TEST(Position, PrintStart) {
    std::ostringstream out;
    print(Position::start(), out);

    const std::string expected = "8  r n b q k b n r\n"
                                 "7  p p p p p p p p\n"
                                 "6  . . . . . . . .\n"
                                 "5  . . . . . . . .\n"
                                 "4  . . . . . . . .\n"
                                 "3  . . . . . . . .\n"
                                 "2  P P P P P P P P\n"
                                 "1  R N B Q K B N R\n"
                                 "   a b c d e f g h\n"
                                 "\n"
                                 "side to move: white\n"
                                 "castling:     KQkq\n"
                                 "en passant:   -\n"
                                 "halfmove:     0\n"
                                 "fullmove:     1\n";
    EXPECT_EQ(out.str(), expected);
}