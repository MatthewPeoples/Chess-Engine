// Runs the engine's own bench command: a fixed set of positions at a fixed depth. It measures
// speed, which is a different question from playing strength

import { spawn } from "node:child_process";
import readline from "node:readline";

export interface BenchResult {
    nodes: number;
    nps: number;
    depth: number;
}

export function runBench(binary: string, signal?: AbortSignal): Promise<BenchResult | undefined> {
    return new Promise((resolve) => {
        const child = spawn(binary, [], { stdio: ["pipe", "pipe", "ignore"] });
        let settled = false;
        let timeout: NodeJS.Timeout;
        const done = (result?: BenchResult) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeout);
            child.kill();
            resolve(result);
        };

        readline.createInterface({ input: child.stdout }).on("line", (line) => {
            if (!line.startsWith("bench ")) {
                return;
            }

            const tokens = line.split(/\s+/);
            const value = (name: string) => Number(tokens[tokens.indexOf(name) + 1] ?? 0);
            done({ nodes: value("nodes"), nps: value("nps"), depth: value("depth") });
        });

        child.on("error", () => done(undefined));
        child.on("close", () => done(undefined));
        signal?.addEventListener("abort", () => done(undefined), { once: true });
        child.stdin.write("bench\n");
        timeout = setTimeout(() => done(undefined), 120_000);
    });
}
