import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";

import type { EngineLine } from "../../shared/protocol.js";

export interface GoLimits {
    wtimeMs: number;
    btimeMs: number;
    wincMs: number;
    bincMs: number;
}

type LineHandler = (line: string) => void;

// Ignore UCI info lines without a completed search depth.
export function parseInfoLine(line: string): EngineLine | null {
    if (!line.startsWith("info ")) {
        return null;
    }

    const tokens = line.split(/\s+/);
    const parsed: Partial<EngineLine> = { multipv: 1, pvUci: [] };

    for (let i = 1; i < tokens.length; i += 1) {
        switch (tokens[i]) {
            case "depth":
                parsed.depth = Number(tokens[++i]);
                break;
            case "seldepth":
                parsed.seldepth = Number(tokens[++i]);
                break;
            case "multipv":
                parsed.multipv = Number(tokens[++i]);
                break;
            case "nodes":
                parsed.nodes = Number(tokens[++i]);
                break;
            case "nps":
                parsed.nps = Number(tokens[++i]);
                break;
            case "time":
                parsed.timeMs = Number(tokens[++i]);
                break;
            case "score":
                if (tokens[i + 1] === "cp") {
                    parsed.scoreCp = Number(tokens[i + 2]);
                } else if (tokens[i + 1] === "mate") {
                    parsed.scoreMate = Number(tokens[i + 2]);
                }
                i += 2;
                break;
            case "pv":
                parsed.pvUci = tokens.slice(i + 1);
                i = tokens.length;
                break;
            default:
                break;
        }
    }

    if (parsed.depth === undefined) {
        return null;
    }

    return {
        multipv: parsed.multipv ?? 1,
        depth: parsed.depth,
        seldepth: parsed.seldepth,
        scoreCp: parsed.scoreCp,
        scoreMate: parsed.scoreMate,
        nodes: parsed.nodes ?? 0,
        nps: parsed.nps ?? 0,
        timeMs: parsed.timeMs ?? 0,
        pvUci: parsed.pvUci ?? [],
        pvSan: [],
    };
}

export class UciEngine {
    private readonly handlers = new Set<LineHandler>();
    private exited = false;
    name = "unknown";

    private constructor(
        private readonly process: ChildProcessWithoutNullStreams,
        readonly path: string,
    ) { }

    static async start(path: string): Promise<UciEngine> {
        const child = spawn(path, [], { stdio: ["pipe", "pipe", "pipe"] });
        child.stderr.resume();

        const engine = new UciEngine(child, path);

        // Keep one stdout reader and fan each line out to active command waiters.
        readline.createInterface({ input: child.stdout }).on("line", (line) => {
            for (const handler of [...engine.handlers]) {
                handler(line);
            }
        });
        child.on("exit", () => {
            engine.exited = true;
        });

        const handshake = engine.waitFor(
            (line) => line.trim() === "uciok",
            (line) => {
                if (line.startsWith("id name")) {
                    engine.name = line.slice("id name".length).trim();
                }
            },
        );
        engine.send("uci");

        await Promise.race([
            handshake,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`${path} did not answer uci`)), 5000)),
        ]);

        return engine;
    }

    private send(command: string): void {
        if (!this.exited) {
            this.process.stdin.write(`${command}\n`);
        }
    }

    private waitFor(matches: (line: string) => boolean, onLine?: LineHandler): Promise<string> {
        return new Promise((resolve, reject) => {
            // both paths take the listeners back off, or a long run leaks one per search
            const done = () => {
                this.handlers.delete(handler);
                this.process.off("exit", onExit);
            };
            const onExit = () => {
                done();
                reject(new Error(`${this.path} exited while waiting`));
            };
            const handler: LineHandler = (line) => {
                onLine?.(line);
                if (matches(line)) {
                    done();
                    resolve(line);
                }
            };

            this.handlers.add(handler);
            this.process.once("exit", onExit);
        });
    }

    async isReady(): Promise<void> {
        const ready = this.waitFor((line) => line.trim() === "readyok");
        this.send("isready");
        await ready;
    }

    async newGame(): Promise<void> {
        this.send("ucinewgame");
        await this.isReady();
    }

    async search(
        startFen: string,
        moves: string[],
        limits: GoLimits,
        onInfo: (line: EngineLine) => void,
    ): Promise<string> {
        this.send(moves.length > 0 ? `position fen ${startFen} moves ${moves.join(" ")}` : `position fen ${startFen}`);

        const best = this.waitFor(
            (line) => line.startsWith("bestmove"),
            (line) => {
                const info = parseInfoLine(line);
                if (info) {
                    onInfo(info);
                }
            },
        );

        this.send(
            `go wtime ${Math.max(Math.round(limits.wtimeMs), 1)} btime ${Math.max(Math.round(limits.btimeMs), 1)}` +
            ` winc ${Math.round(limits.wincMs)} binc ${Math.round(limits.bincMs)}`,
        );

        return (await best).split(/\s+/)[1] ?? "0000";
    }

    stop(): void {
        if (!this.exited) {
            this.send("stop");
        }
    }

    quit(): void {
        if (!this.exited) {
            this.send("quit");
            setTimeout(() => this.process.kill(), 250);
        }
    }
}
