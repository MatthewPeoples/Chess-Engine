// Playing a move and taking it back. If any of this is wrong, perft will say so later and be
// much harder to read, so it gets checked on its own first.

#include "movegen.hpp"

#include <array>
#include <string_view>

#include <gtest/gtest.h>

using namespace chess;

namespace {

constexpr std::array<std::string_view, 6> STANDARD_POSITIONS = {
    START_FEN,
    "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
    "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
    "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
    "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10",
};

Position parse(std::string_view fen) {
    const auto pos = Position::from_fen(fen);
    EXPECT_TRUE(pos.has_value()) << fen;
    return pos.value_or(Position::start());
}

// plays every legal move to the given depth, checking the position comes back untouched each time
void check_restores(Position& pos, int depth) {
    MoveList list;
    generate_legal(pos, list);

    for (const Move m : list) {
        const Position before = pos;

        const Undo undo = pos.do_move(m);
        if (depth > 1) {
            check_restores(pos, depth - 1);
        }
        pos.undo_move(undo);

        ASSERT_EQ(pos, before) << move_name(m);
    }
}

}  // namespace

TEST(MakeMove, UndoRestoresThePositionExactly) {
    for (const std::string_view fen : STANDARD_POSITIONS) {
        Position pos = parse(fen);
        check_restores(pos, 3);
    }
}

TEST(MakeMove, CastlingMovesTheRookAsWell) {
    Position pos = parse("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");

    const Undo undo = pos.do_move(Move::castling(SQ_E1, SQ_G1));
    EXPECT_EQ(pos.piece_on(SQ_G1), W_KING);
    EXPECT_EQ(pos.piece_on(SQ_F1), W_ROOK);
    EXPECT_EQ(pos.piece_on(SQ_H1), NO_PIECE);
    EXPECT_EQ(pos.piece_on(SQ_E1), NO_PIECE);
    EXPECT_EQ(pos.castling_rights(), BLACK_OO | BLACK_OOO);  // white has spent both

    pos.undo_move(undo);
    EXPECT_EQ(pos, parse("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"));
}

TEST(MakeMove, QueensideCastlingPutsTheRookOnD1) {
    Position pos = parse("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");

    pos.do_move(Move::castling(SQ_E1, SQ_C1));
    EXPECT_EQ(pos.piece_on(SQ_C1), W_KING);
    EXPECT_EQ(pos.piece_on(SQ_D1), W_ROOK);
    EXPECT_EQ(pos.piece_on(SQ_A1), NO_PIECE);
}

TEST(MakeMove, EnPassantTakesThePawnBesideIt) {
    Position pos = parse("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");

    const Undo undo = pos.do_move(Move::en_passant(SQ_E5, SQ_D6));
    EXPECT_EQ(pos.piece_on(SQ_D6), W_PAWN);
    EXPECT_EQ(pos.piece_on(SQ_D5), NO_PIECE);  // the pawn taken was never on the square moved to
    EXPECT_EQ(pos.piece_on(SQ_E5), NO_PIECE);

    pos.undo_move(undo);
    EXPECT_EQ(pos.piece_on(SQ_D5), B_PAWN);
}

TEST(MakeMove, PromotionReplacesThePawn) {
    Position pos = parse("1r2k3/P7/8/8/8/8/8/4K3 w - - 0 1");

    const Undo undo = pos.do_move(Move::promotion(SQ_A7, SQ_B8, KNIGHT));
    EXPECT_EQ(pos.piece_on(SQ_B8), W_KNIGHT);
    EXPECT_EQ(pos.piece_on(SQ_A7), NO_PIECE);

    pos.undo_move(undo);
    EXPECT_EQ(pos.piece_on(SQ_A7), W_PAWN);
    EXPECT_EQ(pos.piece_on(SQ_B8), B_ROOK);  // the rook it captured comes back
}

TEST(MakeMove, CapturingARookOnItsHomeSquareCostsTheRights) {
    // the black bishop on b7 takes the rook on h1, so white's kingside right goes with it
    Position pos = parse("4k3/1b6/8/8/8/8/8/R3K2R b KQ - 0 1");

    pos.do_move(Move(SQ_B7, SQ_H1));
    EXPECT_EQ(pos.castling_rights(), WHITE_OOO);
}

TEST(MakeMove, ClocksAndEnPassantSquare) {
    Position pos = parse(START_FEN);

    const Undo first = pos.do_move(Move(SQ_E2, SQ_E4));
    EXPECT_EQ(pos.ep_square(), SQ_E3);  // only a double push leaves one
    EXPECT_EQ(pos.side_to_move(), BLACK);
    EXPECT_EQ(pos.rule50_count(), 0);
    EXPECT_EQ(pos.fullmove_number(), 1);

    const Undo second = pos.do_move(Move(SQ_G8, SQ_F6));
    EXPECT_EQ(pos.ep_square(), SQ_NONE);
    EXPECT_EQ(pos.rule50_count(), 1);  // a knight move is neither a pawn move nor a capture
    EXPECT_EQ(pos.fullmove_number(), 2);

    pos.undo_move(second);
    pos.undo_move(first);
    EXPECT_EQ(pos, parse(START_FEN));
}
