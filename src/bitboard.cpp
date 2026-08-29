#include <chess/bitboard.hpp>

namespace chess {
    int square_index(int file, int rank) {
        return rank * 8 + file;
    }
}
