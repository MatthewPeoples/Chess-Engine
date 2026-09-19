#include <iostream>

#include "uci.hpp"

int main() {
    chess::uci_loop(std::cin, std::cout);
    return 0;
}
