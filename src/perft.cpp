#include "perft.hpp"

#include <ostream>

#include "movegen.hpp"

namespace chess {

std::uint64_t perft(Position& pos, int depth) {
    if (depth <= 0) {
        return 1;
    }

    MoveList list;
    generate_legal(pos, list);

    // the move count at depth 1 is the answer for that branch, so the last make/unmake is skipped
    if (depth == 1) {
        return list.size();
    }

    std::uint64_t nodes = 0;
    for (const Move m : list) {
        const Undo undo = pos.do_move(m);
        nodes += perft(pos, depth - 1);
        pos.undo_move(undo);
    }
    return nodes;
}

std::uint64_t perft_divide(Position& pos, int depth, std::ostream& os) {
    MoveList list;
    generate_legal(pos, list);

    std::uint64_t total = 0;
    for (const Move m : list) {
        const Undo undo       = pos.do_move(m);
        const std::uint64_t n = perft(pos, depth - 1);
        pos.undo_move(undo);

        os << move_name(m) << ": " << n << '\n';
        total += n;
    }

    os << "\nnodes: " << total << '\n';
    return total;
}

}  // namespace chess
