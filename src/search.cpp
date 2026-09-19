#include "search.hpp"

#include <algorithm>
#include <array>
#include <chrono>
#include <ostream>

#include "eval.hpp"
#include "movegen.hpp"

namespace chess {

namespace {

constexpr int INFINITE_SCORE       = 31000;
constexpr int NODES_PER_TIME_CHECK = 2048;

using Clock = std::chrono::steady_clock;

int elapsed_ms(Clock::time_point start) {
    return static_cast<int>(std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now() - start).count());
}

// how long this move gets: what the GUI asked for, or a slice of what is left on the clock
int budget_for(const Position& pos, const Limits& limits) {
    if (limits.infinite) {
        return 0;
    }
    if (limits.movetime > 0) {
        return std::max(limits.movetime - 30, 10);
    }

    const int left = limits.time[pos.side_to_move()];
    if (left <= 0) {
        return 0;
    }

    const int increment = limits.inc[pos.side_to_move()];
    return std::max(std::min((left / 25) + ((increment * 3) / 4), left - 50), 10);
}

class Searcher {
  public:
    Searcher(Position& pos, const Limits& limits, std::ostream* info)
        : pos(pos), limits(limits), info(info), budget(budget_for(pos, limits)) {}

    Result run();

  private:
    int alpha_beta(int depth, int ply, int alpha, int beta);
    int quiesce(int ply, int alpha, int beta);
    int score_move(Move m, int ply) const;
    bool out_of_time();
    void report(int depth, int score, int ms) const;

    Position& pos;
    const Limits& limits;
    std::ostream* info;
    int budget;

    Clock::time_point start = Clock::now();
    std::uint64_t nodes     = 0;
    bool stopped            = false;

    std::array<Move, MAX_PLY> pvLine{};  // the line from the last finished iteration
    std::array<std::array<Move, MAX_PLY>, MAX_PLY> pvTable{};
    std::array<int, MAX_PLY> pvLength{};
};

bool Searcher::out_of_time() {
    if (stopped) {
        return true;
    }
    if (budget > 0 && nodes % NODES_PER_TIME_CHECK == 0 && elapsed_ms(start) >= budget) {
        stopped = true;
    }
    return stopped;
}

// most valuable victim, least valuable attacker: taking a queen with a pawn is tried first
int Searcher::score_move(Move m, int ply) const {
    if (ply < MAX_PLY && m == pvLine[ply]) {
        return 1000000;
    }

    const Piece captured = pos.piece_on(m.to_sq());
    int score            = 0;

    if (captured != NO_PIECE) {
        score = 10000 + (piece_value(type_of(captured)) * 10) - piece_value(type_of(pos.piece_on(m.from_sq())));
    } else if (m.type() == EN_PASSANT) {
        score = 10000 + (piece_value(PAWN) * 10) - piece_value(PAWN);
    }

    if (m.type() == PROMOTION) {
        score += piece_value(m.promotion_piece());
    }
    return score;
}

int Searcher::quiesce(int ply, int alpha, int beta) {
    ++nodes;
    if (out_of_time() || ply >= MAX_PLY - 1) {
        return evaluate(pos);
    }

    const Colour us       = pos.side_to_move();
    const bool inCheck    = pos.in_check(us);
    const int standingPat = evaluate(pos);

    // not forced to take: if the position is already good enough, stop looking
    if (!inCheck) {
        if (standingPat >= beta) {
            return beta;
        }
        alpha = std::max(alpha, standingPat);
    }

    MoveList list;
    if (inCheck) {
        generate_legal(pos, list);  // in check, every reply matters, not just captures
    } else {
        generate<CAPTURES>(pos, list);
    }

    std::array<Move, MAX_MOVES> moves{};
    std::array<int, MAX_MOVES> scores{};
    for (std::size_t i = 0; i < list.size(); ++i) {
        moves[i]  = list[i];
        scores[i] = score_move(list[i], ply);
    }

    int legal = 0;
    for (std::size_t i = 0; i < list.size(); ++i) {
        const auto best =
            static_cast<std::size_t>(std::ranges::max_element(scores.begin() + static_cast<long>(i),
                                                              scores.begin() + static_cast<long>(list.size()))
                                     - scores.begin());
        std::swap(moves[i], moves[best]);
        std::swap(scores[i], scores[best]);

        const Undo undo = pos.do_move(moves[i]);
        if (pos.in_check(us)) {
            pos.undo_move(undo);
            continue;
        }
        ++legal;

        const int score = -quiesce(ply + 1, -beta, -alpha);
        pos.undo_move(undo);

        if (stopped) {
            return alpha;
        }
        if (score >= beta) {
            return beta;
        }
        alpha = std::max(alpha, score);
    }

    if (inCheck && legal == 0) {
        return -MATE_SCORE + ply;
    }
    return alpha;
}

int Searcher::alpha_beta(int depth, int ply, int alpha, int beta) {
    pvLength[ply] = ply;

    if (depth <= 0) {
        return quiesce(ply, alpha, beta);
    }

    ++nodes;
    if (out_of_time() || ply >= MAX_PLY - 1) {
        return evaluate(pos);
    }

    // fifty moves without a pawn move or a capture is a draw
    if (ply > 0 && pos.rule50_count() >= 100) {
        return 0;
    }

    MoveList list;
    generate_legal(pos, list);

    if (list.size() == 0) {
        return pos.in_check(pos.side_to_move()) ? -MATE_SCORE + ply : 0;  // mate or stalemate
    }

    std::array<Move, MAX_MOVES> moves{};
    std::array<int, MAX_MOVES> scores{};
    for (std::size_t i = 0; i < list.size(); ++i) {
        moves[i]  = list[i];
        scores[i] = score_move(list[i], ply);
    }

    for (std::size_t i = 0; i < list.size(); ++i) {
        const auto best =
            static_cast<std::size_t>(std::ranges::max_element(scores.begin() + static_cast<long>(i),
                                                              scores.begin() + static_cast<long>(list.size()))
                                     - scores.begin());
        std::swap(moves[i], moves[best]);
        std::swap(scores[i], scores[best]);

        const Undo undo = pos.do_move(moves[i]);
        const int score = -alpha_beta(depth - 1, ply + 1, -beta, -alpha);
        pos.undo_move(undo);

        if (stopped) {
            return alpha;
        }
        if (score >= beta) {
            return beta;  // the opponent would never allow this line
        }
        if (score > alpha) {
            alpha = score;

            pvTable[ply][ply] = moves[i];
            for (int next = pvLength[ply + 1] - 1; next >= ply + 1; --next) {
                pvTable[ply][next] = pvTable[ply + 1][next];
            }
            pvLength[ply] = pvLength[ply + 1];
        }
    }

    return alpha;
}

void Searcher::report(int depth, int score, int ms) const {
    if (info == nullptr) {
        return;
    }

    *info << "info depth " << depth;

    // a mate score is stored as distance from the root, and reported in moves
    if (score > MATE_SCORE - MAX_PLY) {
        *info << " score mate " << (MATE_SCORE - score + 1) / 2;
    } else if (score < -MATE_SCORE + MAX_PLY) {
        *info << " score mate " << -(MATE_SCORE + score + 1) / 2;
    } else {
        *info << " score cp " << score;
    }

    *info << " nodes " << nodes << " nps " << (ms > 0 ? nodes * 1000 / static_cast<std::uint64_t>(ms) : nodes)
          << " time " << ms << " pv";

    for (int i = 0; i < pvLength[0]; ++i) {
        *info << ' ' << move_name(pvTable[0][i]);
    }
    *info << '\n' << std::flush;
}

Result Searcher::run() {
    Result result;

    MoveList rootMoves;
    generate_legal(pos, rootMoves);
    if (rootMoves.size() == 0) {
        return result;
    }
    result.best = rootMoves[0];

    const int maxDepth = std::min(limits.depth, MAX_PLY - 2);
    for (int depth = 1; depth <= maxDepth; ++depth) {
        const int score = alpha_beta(depth, 0, -INFINITE_SCORE, INFINITE_SCORE);

        // a half-finished iteration is worse than no iteration, so it is thrown away
        if (stopped && depth > 1) {
            break;
        }

        result.best  = pvTable[0][0];
        result.score = score;
        result.depth = depth;
        result.nodes = nodes;

        for (int i = 0; i < pvLength[0]; ++i) {
            pvLine[i] = pvTable[0][i];
        }

        report(depth, score, elapsed_ms(start));

        // no point starting a depth there is no time to finish
        if (budget > 0 && elapsed_ms(start) * 2 >= budget) {
            break;
        }
        if (score > MATE_SCORE - MAX_PLY || score < -MATE_SCORE + MAX_PLY) {
            break;  // a forced mate is as good as it gets
        }
    }

    return result;
}

}  // namespace

Result search(Position& pos, const Limits& limits, std::ostream* info) {
    Searcher searcher(pos, limits, info);
    return searcher.run();
}

}  // namespace chess
