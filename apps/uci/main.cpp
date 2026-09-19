#include <iostream>
#include <optional>
#include <string>
#include <string_view>

#include "bitboard.hpp"
#include "move.hpp"
#include "movegen.hpp"
#include "position.hpp"

namespace {

std::optional<chess::Square> to_square(std::string_view text) {
    if (text.size() != 2 || text[0] < 'a' || text[0] > 'h' || text[1] < '1' || text[1] > '8') {
        return std::nullopt;
    }
    return chess::make_square(chess::File(text[0] - 'a'), chess::Rank(text[1] - '1'));
}

std::optional<chess::PieceType> to_promotion(char ch) {
    constexpr std::string_view letters = "nbrq";

    const std::size_t i = letters.find(ch);
    if (i == std::string_view::npos) {
        return std::nullopt;
    }
    return chess::PieceType(i + chess::KNIGHT);
}

// "e2e4" or "e7e8q"
std::optional<chess::Move> to_move(std::string_view text) {
    if (text.size() != 4 && text.size() != 5) {
        return std::nullopt;
    }

    const auto from = to_square(text.substr(0, 2));
    const auto to   = to_square(text.substr(2, 2));
    if (!from.has_value() || !to.has_value()) {
        return std::nullopt;
    }
    if (text.size() == 4) {
        return chess::Move(*from, *to);
    }

    const auto pt = to_promotion(text[4]);
    if (!pt.has_value()) {
        return std::nullopt;
    }
    return chess::Move::promotion(*from, *to, *pt);
}

}  // namespace

int main() {
    chess::Position pos = chess::Position::start();
    chess::print(pos, std::cout);

    std::string line;
    while (std::getline(std::cin, line)) {
        // every pseudo-legal move in the position on screen
        if (line == "moves") {
            chess::MoveList list;
            chess::generate<chess::ALL>(pos, list);

            for (const chess::Move m : list) {
                std::cout << chess::move_name(m) << ' ';
            }
            std::cout << "\n" << list.size() << " moves\n";
            continue;
        }

        // a square prints the attack sets from it, blocked by whatever is on the board
        if (const auto sq = to_square(line); sq.has_value()) {
            const chess::Bitboard occupied = pos.pieces();

            std::cout << "knight\n";
            chess::print(chess::knight_attacks(*sq), std::cout);
            std::cout << "king\n";
            chess::print(chess::king_attacks(*sq), std::cout);
            std::cout << "white pawn\n";
            chess::print(chess::pawn_attacks(chess::WHITE, *sq), std::cout);
            std::cout << "rook\n";
            chess::print(chess::rook_attacks(*sq, occupied), std::cout);
            std::cout << "bishop\n";
            chess::print(chess::bishop_attacks(*sq, occupied), std::cout);
            continue;
        }

        // a move is packed, then read straight back out of the 16 bits
        if (const auto m = to_move(line); m.has_value()) {
            std::cout << chess::move_name(*m) << "  from " << chess::square_name(m->from_sq()) << "  to "
                      << chess::square_name(m->to_sq()) << "  bits 0x" << std::hex << m->raw() << std::dec << '\n';
            continue;
        }

        const auto parsed = chess::Position::from_fen(line);
        if (parsed.has_value()) {
            pos = *parsed;
            chess::print(pos, std::cout);
        } else {
            std::cout << "invalid FEN\n";
        }
    }
    return 0;
}
