import type { EngineLine, MoveRecord } from "../../../shared/protocol.js";

// Show tenths below twenty seconds, when whole seconds are too coarse.
export function formatClock(ms: number): string {
    const safe = Math.max(0, ms);
    if (safe < 20_000) {
        return (safe / 1000).toFixed(1);
    }

    const total = Math.ceil(safe / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function formatNodes(nodes: number): string {
    if (nodes >= 1_000_000) {
        return `${(nodes / 1_000_000).toFixed(1)}M`;
    }
    if (nodes >= 1_000) {
        return `${Math.round(nodes / 1_000)}k`;
    }
    return String(nodes);
}

export function formatSeconds(ms: number): string {
    return `${(ms / 1000).toFixed(2)}s`;
}

// UCI scores use the mover's perspective; normalize them to White's perspective for display.
export function whiteScore(line: EngineLine | undefined, mover: "w" | "b"): number | null {
    if (!line) {
        return null;
    }
    const sign = mover === "w" ? 1 : -1;

    if (line.scoreMate !== undefined) {
        return sign * (line.scoreMate > 0 ? 10_000 : -10_000);
    }
    return line.scoreCp === undefined ? null : sign * line.scoreCp;
}

export function formatScore(line: EngineLine | undefined, mover: "w" | "b"): string {
    if (!line) {
        return "—";
    }
    if (line.scoreMate !== undefined) {
        const sign = (mover === "w" ? 1 : -1) * Math.sign(line.scoreMate);
        return `${sign > 0 ? "+" : "−"}M${Math.abs(line.scoreMate)}`;
    }
    if (line.scoreCp === undefined) {
        return "—";
    }

    const pawns = ((mover === "w" ? 1 : -1) * line.scoreCp) / 100;
    return `${pawns >= 0 ? "+" : "−"}${Math.abs(pawns).toFixed(2)}`;
}

export function scoreTone(line: EngineLine | undefined, mover: "w" | "b"): "good" | "bad" | undefined {
    const score = whiteScore(line, mover);
    if (score === null || Math.abs(score) < 20) {
        return undefined;
    }
    return score > 0 ? "good" : "bad";
}

export function lastMoveTime(moves: MoveRecord[]): string {
    const last = moves[moves.length - 1];
    return last ? formatSeconds(last.msSpent) : "—";
}

export function averageMoveTime(moves: MoveRecord[], colour: "w" | "b" | null): string {
    const mine = colour ? moves.filter((move) => move.colour === colour) : moves;
    if (mine.length === 0) {
        return "—";
    }
    return formatSeconds(mine.reduce((total, move) => total + move.msSpent, 0) / mine.length);
}
