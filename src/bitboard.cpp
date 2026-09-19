#include "bitboard.hpp"

#include <ostream>

namespace chess {

void print(Bitboard bb, std::ostream& os) {
    for (int r = RANK_8; r >= RANK_1; --r) {
        os << r + 1 << ' ';
        for (int f = FILE_A; f <= FILE_H; ++f) {
            os << ' ' << ((bb & square_bb(make_square(File(f), Rank(r)))) != 0 ? 'x' : '.');
        }
        os << '\n';
    }
    os << "   a b c d e f g h\n";
}

}  // namespace chess