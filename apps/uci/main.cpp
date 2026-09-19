#include <iostream>
#include <string>

#include "bitboard.hpp"
#include "position.hpp"

int main() {
    chess::print(chess::Position::start(), std::cout);

    std::string line;
    while (std::getline(std::cin, line)) {
        // a square name prints the attack sets from it, anything else is treated as a FEN
        if (line.size() == 2 && line[0] >= 'a' && line[0] <= 'h' && line[1] >= '1' && line[1] <= '8') {
            const chess::Square sq = chess::make_square(chess::File(line[0] - 'a'), chess::Rank(line[1] - '1'));

            std::cout << "knight\n";
            chess::print(chess::knight_attacks(sq), std::cout);
            std::cout << "king\n";
            chess::print(chess::king_attacks(sq), std::cout);
            std::cout << "white pawn\n";
            chess::print(chess::pawn_attacks(chess::WHITE, sq), std::cout);
            continue;
        }

        const auto pos = chess::Position::from_fen(line);
        if (pos.has_value()) {
            chess::print(*pos, std::cout);
        } else {
            std::cout << "invalid FEN\n";
        }
    }
    return 0;
}