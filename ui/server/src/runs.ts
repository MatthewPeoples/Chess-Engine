// The run history. Committed to the repo on purpose

import fs from "node:fs";
import path from "node:path";

import type { RunSummary } from "../../shared/protocol.js";

const DATA = path.resolve(import.meta.dirname, "../data");
const FILE = path.join(DATA, "runs.json");

export function loadRuns(): RunSummary[] {
    if (!fs.existsSync(FILE)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(FILE, "utf8")) as RunSummary[];
    } catch {
        return [];
    }
}

export function appendRun(run: RunSummary): RunSummary[] {
    const runs = [...loadRuns(), run];
    fs.mkdirSync(DATA, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(runs, null, 2));
    return runs;
}
