// Elo from a match result, and the sequential test that says whether a change is real or noise
//
// SPRT watches the log-likelihood ratio: how strongly the games favour "this version gained
// elo1" over "it gained elo0". Crossing +2.94 means 95% confident it is an improvement,
// -2.94 means 95% confident it is not, and in between there is not enough evidence yet.

import { LLR_BOUND, type ArenaScore } from "../../shared/protocol.js";

const ELO0 = 0; // the null: no improvement
const ELO1 = 5; // the alternative: worth keeping

export function scoreRate(wins: number, draws: number, losses: number): number {
    const games = wins + draws + losses;
    return games === 0 ? 0 : (wins + draws / 2) / games;
}

export function elo(wins: number, draws: number, losses: number): number {
    const score = scoreRate(wins, draws, losses);
    if (score <= 0) {
        return -800;
    }
    if (score >= 1) {
        return 800;
    }
    return -400 * Math.log10(1 / score - 1);
}

// The 95% margin
export function eloError(wins: number, draws: number, losses: number): number {
    const games = wins + draws + losses;
    if (games < 2) {
        return 800;
    }

    const score = scoreRate(wins, draws, losses);
    const variance =
        (wins / games) * (1 - score) ** 2 + (draws / games) * (0.5 - score) ** 2 + (losses / games) * score ** 2;
    const deviation = Math.sqrt(variance / games);
    if (deviation === 0) {
        return 0;
    }

    const clamp = (value: number) => Math.min(Math.max(value, 0.001), 0.999);
    const high = -400 * Math.log10(1 / clamp(score + 1.96 * deviation) - 1);
    const low = -400 * Math.log10(1 / clamp(score - 1.96 * deviation) - 1);
    return (high - low) / 2;
}

function probabilities(rating: number, drawElo: number): [number, number, number] {
    const win = 1 / (1 + 10 ** ((-rating + drawElo) / 400));
    const loss = 1 / (1 + 10 ** ((rating + drawElo) / 400));
    return [win, 1 - win - loss, loss];
}

export function llr(wins: number, draws: number, losses: number): number {
    if (wins === 0 || draws === 0 || losses === 0) {
        return 0;
    }

    const games = wins + draws + losses;
    const [win, loss] = [wins / games, losses / games];
    const drawElo = 200 * Math.log10(((1 - loss) / loss) * ((1 - win) / win));

    const [w0, d0, l0] = probabilities(ELO0, drawElo);
    const [w1, d1, l1] = probabilities(ELO1, drawElo);

    return wins * Math.log(w1 / w0) + draws * Math.log(d1 / d0) + losses * Math.log(l1 / l0);
}

// While a run is going this is provisional. A run that played every game without crossing a
// bound falls back to the margin; one that was stopped early stays undecided, because a short
// sample is not evidence either way
export function verdict(wins: number, draws: number, losses: number, complete: boolean): ArenaScore["verdict"] {
    const value = llr(wins, draws, losses);
    if (value >= LLR_BOUND) {
        return "accepted";
    }
    if (value <= -LLR_BOUND) {
        return "rejected";
    }
    if (!complete) {
        return "undecided";
    }

    // ran out of games without crossing: keep it only if the margin still clears zero
    const rating = elo(wins, draws, losses);
    return rating - eloError(wins, draws, losses) > 0 ? "accepted" : "rejected";
}

export function summarise(
    wins: number,
    draws: number,
    losses: number,
    total: number,
    elapsedMs: number,
    complete: boolean,
): ArenaScore {
    const played = wins + draws + losses;
    const perHour = elapsedMs > 0 ? (played / elapsedMs) * 3_600_000 : 0;

    return {
        played,
        total,
        wins,
        draws,
        losses,
        elo: elo(wins, draws, losses),
        error: eloError(wins, draws, losses),
        llr: llr(wins, draws, losses),
        verdict: verdict(wins, draws, losses, complete),
        gamesPerHour: perHour,
        elapsedMs,
        remainingMs: perHour > 0 ? ((total - played) / perHour) * 3_600_000 : 0,
    };
}
