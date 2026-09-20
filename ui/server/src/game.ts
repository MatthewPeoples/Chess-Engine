import { Chess } from "chess.js";

import type {
    BuildInfo,
    Colour,
    EngineLine,
    GameState,
    MoveRecord,
    PlayerInfo,
    ServerMessage,
    TimeControl,
} from "../../shared/protocol.js";
import { UciEngine } from "./uci-engine.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

interface Options {
    builds: Partial<Record<Colour, BuildInfo>>;
    timeControl: TimeControl;
}

export class Game {
    private chess = new Chess();
    private engines: Partial<Record<Colour, UciEngine>> = {};
    private players: Record<Colour, PlayerInfo> = {
        w: { kind: "engine", version: null },
        b: { kind: "engine", version: null },
    };
    private clocks: Record<Colour, number> = { w: 0, b: 0 };
    private moves: MoveRecord[] = [];
    private lastMove: { from: string; to: string } | undefined;
    private status: GameState["status"] = "idle";
    private result: GameState["result"];
    private timeControl: TimeControl = { name: "3+2", baseMs: 180_000, incrementMs: 2_000 };
    private redo: MoveRecord[] = [];
    private turnStartedAt = 0;
    // Invalidates asynchronous engine loops when a game is replaced or disposed.
    private generation = 0;
    private paused = false;

    constructor(private readonly send: (message: ServerMessage) => void) { }

    state(): GameState {
        return {
            status: this.status,
            fen: this.chess.fen(),
            turn: this.chess.turn(),
            check: this.chess.inCheck(),
            lastMove: this.lastMove,
            moves: this.moves,
            clocks: this.clocks,
            players: this.players,
            timeControl: this.timeControl,
            paused: this.paused,
            result: this.result,
        };
    }

    private isHumanVsEngine(): boolean {
        const humans =
            (this.players.w.kind === "human" ? 1 : 0) + (this.players.b.kind === "human" ? 1 : 0);
        return humans === 1;
    }

    private freezeClockForSideToMove(): void {
        const colour = this.chess.turn();
        const spent = Date.now() - this.turnStartedAt;
        this.clocks[colour] = Math.max(0, this.clocks[colour] - spent);
    }

    private publish(): void {
        this.send({ type: "state", state: this.state() });
    }

    async start(options: Options): Promise<void> {
        this.dispose();
        this.generation += 1;
        const generation = this.generation;

        this.chess = new Chess();
        this.moves = [];
        this.lastMove = undefined;
        this.result = undefined;
        this.timeControl = options.timeControl;
        this.clocks = { w: options.timeControl.baseMs, b: options.timeControl.baseMs };
        this.status = "playing";
        this.paused = false;

        this.redo = [];
        for (const colour of ["w", "b"] as Colour[]) {
            const build = options.builds[colour];
            if (!build) {
                this.players[colour] = { kind: "human", version: null };
                continue;
            }

            const engine = await UciEngine.start(build.path);
            await engine.newGame();
            if (generation !== this.generation) {
                engine.quit();
                return;
            }
            this.engines[colour] = engine;
            this.players[colour] = { kind: "engine", version: engine.name };
        }

        this.turnStartedAt = Date.now();
        this.publish();
        void this.engineTurnIfNeeded(generation);
    }

    async humanMove(from: string, to: string, promotion?: string): Promise<void> {
        if (this.status !== "playing" || this.paused || this.players[this.chess.turn()].kind !== "human") {
            return;
        }

        const colour = this.chess.turn();
        const spent = Date.now() - this.turnStartedAt;

        let move;
        try {
            move = this.chess.move({ from, to, promotion: promotion ?? "q" });
        } catch {
            this.send({ type: "error", message: `illegal move ${from}${to}` });
            return;
        }

        this.record(move.san, from + to + (move.promotion ?? ""), colour, spent);
        if (this.chargeClock(colour, spent)) {
            return;
        }

        this.publish();
        void this.engineTurnIfNeeded(this.generation);
    }

    // Rewind a full turn so human-vs-engine games return control to the human.
    takeback(): void {
        if (this.status !== "playing" || this.paused || this.players[this.chess.turn()].kind !== "human") {
            return;
        }

        for (let i = 0; i < 2 && this.moves.length > 0; i += 1) {
            this.chess.undo();
            const taken = this.moves[this.moves.length - 1];
            this.moves = this.moves.slice(0, -1);
            if (taken) {
                this.redo = [taken, ...this.redo];
            }
        }

        const previous = this.moves[this.moves.length - 1];
        this.lastMove = previous ? { from: previous.uci.slice(0, 2), to: previous.uci.slice(2, 4) } : undefined;
        this.turnStartedAt = Date.now();
        this.publish();
    }

    forward(): void {
        if (this.status !== "playing" || this.paused) {
            return;
        }

        for (let i = 0; i < 2 && this.redo.length > 0; i += 1) {
            const next = this.redo[0];
            if (!next) {
                return;
            }
            const move = applyUci(this.chess, next.uci);
            if (!move) {
                return;
            }
            const rest = this.redo.slice(1);
            this.record(move.san, next.uci, next.colour, next.msSpent);
            this.redo = rest;
        }

        this.turnStartedAt = Date.now();
        this.publish();
    }

    resign(): void {
        if (this.status !== "playing") {
            return;
        }
        const loser = this.players.w.kind === "human" ? "w" : "b";
        this.finish(loser === "w" ? "0-1" : "1-0", "resignation");
    }

    setPause(paused: boolean): void {
        if (this.status !== "playing" || !this.isHumanVsEngine() || paused === this.paused) {
            return;
        }

        if (paused) {
            this.freezeClockForSideToMove();
            this.paused = true;

            const colour = this.chess.turn();
            const engine = this.engines[colour];
            if (this.players[colour].kind === "engine" && engine) {
                engine.stop();
                this.send({
                    type: "engine",
                    snapshot: {
                        colour,
                        version: engine.name,
                        thinking: false,
                        lines: [],
                    },
                });
            }

            this.publish();
            return;
        }

        this.paused = false;
        this.turnStartedAt = Date.now();
        this.publish();
        void this.engineTurnIfNeeded(this.generation);
    }

    dispose(): void {
        this.generation += 1;
        for (const engine of Object.values(this.engines)) {
            engine?.quit();
        }
        this.engines = {};
    }

    private record(san: string, uci: string, colour: Colour, msSpent: number): void {
        this.moves = [...this.moves, { san, uci, colour, msSpent }];
        this.redo = [];
        this.lastMove = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
    }

    // Return true when this move ends the game by timeout or board state.
    private chargeClock(colour: Colour, spent: number): boolean {
        this.clocks[colour] -= spent;
        if (this.clocks[colour] <= 0) {
            this.clocks[colour] = 0;
            this.finish(colour === "w" ? "0-1" : "1-0", "out of time");
            return true;
        }

        this.clocks[colour] += this.timeControl.incrementMs;
        this.turnStartedAt = Date.now();
        return this.checkGameOver();
    }

    private checkGameOver(): boolean {
        if (!this.chess.isGameOver()) {
            return false;
        }

        if (this.chess.isCheckmate()) {
            this.finish(this.chess.turn() === "w" ? "0-1" : "1-0", "checkmate");
        } else if (this.chess.isStalemate()) {
            this.finish("1/2-1/2", "stalemate");
        } else if (this.chess.isThreefoldRepetition()) {
            this.finish("1/2-1/2", "threefold repetition");
        } else if (this.chess.isInsufficientMaterial()) {
            this.finish("1/2-1/2", "insufficient material");
        } else if (this.chess.isDrawByFiftyMoves()) {
            this.finish("1/2-1/2", "fifty move rule");
        } else {
            this.finish("1/2-1/2", "draw");
        }
        return true;
    }

    private finish(text: string, reason: string): void {
        this.status = "finished";
        this.paused = false;
        this.result = { text, reason };
        this.dispose();
        this.publish();
    }

    private async engineTurnIfNeeded(generation: number): Promise<void> {
        while (
            generation === this.generation &&
            this.status === "playing" &&
            !this.paused &&
            this.players[this.chess.turn()].kind === "engine"
        ) {
            const colour = this.chess.turn();
            const engine = this.engines[colour];
            if (!engine) {
                return;
            }

            const before = this.chess.fen();
            this.send({
                type: "engine",
                snapshot: { colour, version: engine.name, thinking: true, lines: [] },
            });

            const lines = new Map<number, EngineLine>();
            const startedAt = Date.now();

            let best: string;
            try {
                best = await engine.search(
                    START_FEN,
                    this.moves.map((move) => move.uci),
                    {
                        wtimeMs: this.clocks.w,
                        btimeMs: this.clocks.b,
                        wincMs: this.timeControl.incrementMs,
                        bincMs: this.timeControl.incrementMs,
                    },
                    (line) => {
                        lines.set(line.multipv, { ...line, pvSan: toSan(before, line.pvUci) });
                        this.send({
                            type: "engine",
                            snapshot: {
                                colour,
                                version: engine.name,
                                thinking: true,
                                lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv),
                            },
                        });
                    },
                );
            } catch (error) {
                // Replacing or ending a game intentionally terminates an in-flight search.
                if (generation !== this.generation || this.status !== "playing") {
                    return;
                }
                this.send({ type: "error", message: `engine stopped: ${String(error)}` });
                this.finish("*", "engine stopped");
                return;
            }

            if (generation !== this.generation || this.paused) {
                return;
            }

            this.send({
                type: "engine",
                snapshot: {
                    colour,
                    version: engine.name,
                    thinking: false,
                    lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv),
                },
            });

            const spent = Date.now() - startedAt;
            const move = applyUci(this.chess, best);
            if (!move) {
                this.finish(colour === "w" ? "0-1" : "1-0", `illegal move from engine (${best})`);
                return;
            }

            this.record(move.san, best, colour, spent);
            if (this.chargeClock(colour, spent)) {
                return;
            }
            this.publish();
        }
    }
}

function applyUci(chess: Chess, uci: string) {
    if (uci.length < 4) {
        return null;
    }
    try {
        return chess.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.length > 4 ? uci[4] : undefined,
        });
    } catch {
        return null;
    }
}

function toSan(fen: string, pv: string[]): string[] {
    const board = new Chess(fen);
    const san: string[] = [];

    for (const uci of pv) {
        const move = applyUci(board, uci);
        if (!move) {
            break;
        }
        san.push(move.san);
    }
    return san;
}
