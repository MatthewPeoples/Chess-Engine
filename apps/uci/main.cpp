#include <iostream>
#include <string>

#include "position.hpp"

int main() {
    chess::print(chess::Position::start(), std::cout);

    std::string line;
    while (std::getline(std::cin, line)) {
        const auto pos = chess::Position::from_fen(line);
        if (pos.has_value()) {
            chess::print(*pos, std::cout);
        } else {
            std::cout << "invalid FEN\n";
        }
    }
    return 0;
}