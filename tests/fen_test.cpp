// FEN both ways: text in, text back out unchanged, and a table of malformed strings
// that all have to be rejected rather than half-parsed.

#include "position.hpp"

#include <string_view>
#include <vector>

#include <gtest/gtest.h>

using namespace chess;

namespace {

// perft positions from the wiki, kept here because milestone 9 needs them anyway
constexpr std::string_view KIWIPETE      = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
constexpr std::string_view ENDGAME       = "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1";
constexpr std::string_view PROMOTION_FEN = "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1";
constexpr std::string_view AFTER_E4      = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

}  // namespace

TEST(Fen, StartPositionMatchesHardcodedBoard) {
    const auto parsed = Position::from_fen(START_FEN);

    ASSERT_TRUE(parsed.has_value());
    EXPECT_EQ(*parsed, Position::start());
}

TEST(Fen, RoundTrip) {
    for (const std::string_view fen : {START_FEN, KIWIPETE, ENDGAME, PROMOTION_FEN, AFTER_E4}) {
        const auto pos = Position::from_fen(fen);

        ASSERT_TRUE(pos.has_value()) << fen;
        EXPECT_EQ(pos->fen(), fen);
    }
}

TEST(Fen, ParsesStateFields) {
    const auto pos = Position::from_fen(AFTER_E4);

    ASSERT_TRUE(pos.has_value());
    EXPECT_EQ(pos->side_to_move(), BLACK);
    EXPECT_EQ(pos->ep_square(), SQ_E3);
    EXPECT_EQ(pos->castling_rights(), ANY_CASTLING);
    EXPECT_EQ(pos->piece_on(SQ_E4), W_PAWN);
    EXPECT_EQ(pos->piece_on(SQ_E2), NO_PIECE);
}

TEST(Fen, ParsesPartialCastlingRights) {
    const auto pos = Position::from_fen(PROMOTION_FEN);

    ASSERT_TRUE(pos.has_value());
    EXPECT_EQ(pos->castling_rights(), BLACK_OO | BLACK_OOO);
}

TEST(Fen, FourFieldsDefaultTheClocks) {
    const auto pos = Position::from_fen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -");

    ASSERT_TRUE(pos.has_value());
    EXPECT_EQ(pos->rule50_count(), 0);
    EXPECT_EQ(pos->fullmove_number(), 1);
    EXPECT_EQ(pos->fen(), KIWIPETE);
}

TEST(Fen, RejectsMalformed) {
    const std::vector<std::string_view> bad = {
        "",
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",                  // placement only
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0",       // five fields
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1",              // seven ranks
        "rnbqkbnr/pppppppp/8/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",   // nine ranks
        "rnbqkbnrr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",    // nine squares on a rank
        "rnbqkbn/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",      // seven squares on a rank
        "rnbqkbxr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",     // unknown piece letter
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1",     // side to move
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkqK - 0 1",    // right spelled twice
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KX - 0 1",       // unknown castling letter
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e6 0 1",  // ep rank wrong for black
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq z9 0 1",    // ep not a square
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - -1 1",    // negative halfmove
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 0",     // fullmove below 1
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1x",    // trailing rubbish
        "rnbq1bnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",     // no black king
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBKR w KQkq - 0 1",     // two white kings
    };

    for (const std::string_view fen : bad) {
        EXPECT_FALSE(Position::from_fen(fen).has_value()) << "accepted: " << fen;
    }
}
