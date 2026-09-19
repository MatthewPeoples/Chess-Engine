// Packing and unpacking a move, and the list that holds them.

#include "move.hpp"

#include <string>

#include <gtest/gtest.h>

using namespace chess;

TEST(Move, EverySquarePairSurvivesPacking) {
    for (int from = SQ_A1; from <= SQ_H8; ++from) {
        for (int to = SQ_A1; to <= SQ_H8; ++to) {
            const Move m = Move(Square(from), Square(to));

            EXPECT_EQ(m.from_sq(), Square(from));
            EXPECT_EQ(m.to_sq(), Square(to));
            EXPECT_EQ(m.type(), NORMAL);
        }
    }
}

TEST(Move, PromotionKeepsItsPiece) {
    for (const PieceType pt : {KNIGHT, BISHOP, ROOK, QUEEN}) {
        const Move m = Move::promotion(SQ_E7, SQ_E8, pt);

        EXPECT_EQ(m.from_sq(), SQ_E7);
        EXPECT_EQ(m.to_sq(), SQ_E8);
        EXPECT_EQ(m.type(), PROMOTION);
        EXPECT_EQ(m.promotion_piece(), pt);
    }
}

TEST(Move, SpecialMovesKeepTheirType) {
    EXPECT_EQ(Move::en_passant(SQ_E5, SQ_D6).type(), EN_PASSANT);
    EXPECT_EQ(Move::castling(SQ_E1, SQ_G1).type(), CASTLING);
    EXPECT_EQ(Move(SQ_E2, SQ_E4).type(), NORMAL);

    // the squares still come back out of a special move
    EXPECT_EQ(Move::castling(SQ_E1, SQ_C1).from_sq(), SQ_E1);
    EXPECT_EQ(Move::castling(SQ_E1, SQ_C1).to_sq(), SQ_C1);
}

TEST(Move, Equality) {
    EXPECT_EQ(Move(SQ_E2, SQ_E4), Move(SQ_E2, SQ_E4));
    EXPECT_NE(Move(SQ_E2, SQ_E4), Move(SQ_E4, SQ_E2));
    EXPECT_NE(Move(SQ_E7, SQ_E8), Move::promotion(SQ_E7, SQ_E8, QUEEN));
    EXPECT_NE(Move::promotion(SQ_E7, SQ_E8, QUEEN), Move::promotion(SQ_E7, SQ_E8, ROOK));
}

TEST(Move, Names) {
    EXPECT_EQ(move_name(Move(SQ_E2, SQ_E4)), "e2e4");
    EXPECT_EQ(move_name(Move(SQ_A1, SQ_H8)), "a1h8");
    EXPECT_EQ(move_name(Move::castling(SQ_E1, SQ_G1)), "e1g1");
    EXPECT_EQ(move_name(Move::en_passant(SQ_E5, SQ_D6)), "e5d6");
    EXPECT_EQ(move_name(Move::promotion(SQ_E7, SQ_E8, QUEEN)), "e7e8q");
    EXPECT_EQ(move_name(Move::promotion(SQ_E7, SQ_E8, KNIGHT)), "e7e8n");
    EXPECT_EQ(move_name(Move::promotion(SQ_B2, SQ_A1, ROOK)), "b2a1r");
    EXPECT_EQ(move_name(Move::promotion(SQ_B2, SQ_A1, BISHOP)), "b2a1b");
}

TEST(MoveList, HoldsMovesInOrder) {
    MoveList list;
    list.add(Move(SQ_E2, SQ_E4));
    list.add(Move(SQ_G1, SQ_F3));
    list.add(Move::promotion(SQ_E7, SQ_E8, QUEEN));

    ASSERT_EQ(list.size(), 3U);
    EXPECT_EQ(list[0], Move(SQ_E2, SQ_E4));
    EXPECT_EQ(list[2].promotion_piece(), QUEEN);

    std::string names;
    for (const Move m : list) {
        names += move_name(m) + ' ';
    }
    EXPECT_EQ(names, "e2e4 g1f3 e7e8q ");
}

TEST(MoveList, StartsEmptyAndTakesAFullPositionsWorth) {
    MoveList list;
    EXPECT_EQ(list.size(), 0U);

    for (std::size_t i = 0; i < MAX_MOVES; ++i) {
        list.add(Move(SQ_E2, SQ_E4));
    }
    EXPECT_EQ(list.size(), MAX_MOVES);
}
