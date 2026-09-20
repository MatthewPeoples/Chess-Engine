import type { RunSummary } from "../../../shared/protocol.js";

export interface EloPoint {
    version: string;
    elo: number;
    error: number;
}

// Each run is Elo against one older version, so the numbers chain into a running total and the
// line becomes the whole project's progress rather than one comparison
export function cumulativeElo(runs: RunSummary[]): EloPoint[] {
    const total = new Map<string, number>();
    const points: EloPoint[] = [];

    for (const run of [...runs].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))) {
        if (!total.has(run.opponent)) {
            total.set(run.opponent, 0);
            points.push({ version: run.opponent, elo: 0, error: 0 });
        }

        const base = total.get(run.opponent) ?? 0;
        total.set(run.main, base + run.elo);

        const existing = points.findIndex((point) => point.version === run.main);
        const point = { version: run.main, elo: base + run.elo, error: run.error };
        if (existing >= 0) {
            points[existing] = point;
        } else {
            points.push(point);
        }
    }

    return points;
}
