// The arena match runner. Plays one version against another, several games at a time, and keeps a
// running score with the sequential test that says whether the difference is real.
//
// Every opening is played twice with the colours swapped, so white's advantage cancels out and
// the two versions meet the same positions from both sides.

import { Chess } from "chess.js";

import type {
    ArenaGame,
    ArenaSetup,
    ArenaState,
    BuildInfo,
    Colour,
    RunSummary,
    ServerMessage,
    TimeControl,
} from "../../shared/protocol.js";
import { runBench } from "./bench.js";
import { appendRun } from "./runs.js";
import { summarise } from "./sprt.js";
import { UciEngine } from "./uci-engine.js";

const MAX_PLIES = 300; // no repetition detection in the engine yet, so long games get adjudicated
const BROADCAST_MS = 200;

type Outcome = "win" | "draw" | "loss"; // always from the main version's point of view

interface Slot {
    main: UciEngine;
    opponent: UciEngine;
}

export class Arena {
    private phase: ArenaState["phase"] = "idle";
    private setup?: ArenaSetup;
    private mainVersion = "";
    private opponentVersion = "";
    private bench?: { nodes: number; nps: number; depth: number };

    private games: ArenaGame[] = [];
    private slots: Slot[] = [];
    private wins = 0;
    private draws = 0;
    private losses = 0;
    private nextIndex = 0;
    private startedAt = 0;
    private stopped = false;
    private timer?: NodeJS.Timeout;
    private benchAbort?: AbortController;

    constructor(private readonly send: (message: ServerMessage) => void) {}

    state(): ArenaState {
        const elapsed = this.startedAt === 0 ? 0 : Date.now() - this.startedAt;
        // only a run that played every game gets a final verdict; one stopped early stays undecided
        const complete = this.setup !== undefined && this.wins + this.draws + this.losses >= this.setup.games;

        return {
            phase: this.phase,
            setup: this.setup,
            mainVersion: this.mainVersion,
            opponentVersion: this.opponentVersion,
            games: this.games,
            bench: this.bench,
            score: summarise(this.wins, this.draws, this.losses, this.setup?.games ?? 0, elapsed, complete),
        };
    }

    private publish(): void {
        this.send({ type: "arena", state: this.state() });
    }

    async start(
        setup: ArenaSetup,
        main: BuildInfo,
        opponent: BuildInfo,
        timeControl: TimeControl,
        book: string[],
    ): Promise<void> {
        this.dispose();

        const parallel = Math.min(Math.max(setup.parallel, 2), 8);
        this.setup = { ...setup, parallel };
        this.stopped = false;
        this.wins = this.draws = this.losses = 0;
        this.nextIndex = 0;
        this.games = [];
        this.bench = undefined;
        this.startedAt = Date.now();

        // speed first: a fixed workload on the main version, before the machine is busy playing
        this.phase = "bench";
        this.publish();
        this.benchAbort = new AbortController();
        this.bench = await runBench(main.path, this.benchAbort.signal);
        this.benchAbort = undefined;
        if (this.stopped) {
            return;
        }

        this.phase = "playing";
        this.timer = setInterval(() => this.publish(), BROADCAST_MS);

        for (let slot = 0; slot < parallel; slot += 1) {
            this.games.push(emptyGame(slot));
        }

        try {
            for (let slot = 0; slot < parallel; slot += 1) {
                if (this.stopped) {
                    return;
                }
                const mainEngine = await UciEngine.start(main.path);
                if (this.stopped) {
                    mainEngine.quit();
                    return;
                }
                const opponentEngine = await UciEngine.start(opponent.path);
                if (this.stopped) {
                    mainEngine.quit();
                    opponentEngine.quit();
                    return;
                }
                this.slots.push({ main: mainEngine, opponent: opponentEngine });
            }
        } catch (error) {
            if (this.stopped) {
                return;
            }
            this.send({ type: "error", message: `could not start an engine: ${String(error)}` });
            this.finish(timeControl);
            return;
        }

        this.mainVersion = this.slots[0]?.main.name ?? main.label;
        this.opponentVersion = this.slots[0]?.opponent.name ?? opponent.label;
        this.publish();

        await Promise.all(this.slots.map((slot, index) => this.runSlot(slot, index, setup, timeControl, book)));
        if (this.stopped) {
            return;
        }
        this.finish(timeControl);
    }

    stop(): void {
        if (this.phase !== "bench" && this.phase !== "playing") {
            return;
        }
        this.stopped = true;
        this.benchAbort?.abort();
        this.benchAbort = undefined;
        clearInterval(this.timer);
        this.timer = undefined;
        for (const slot of this.slots) {
            slot.main.quit();
            slot.opponent.quit();
        }
        this.slots = [];
        this.phase = "stopped";
        this.publish();
    }

    dispose(): void {
        this.stopped = true;
        this.benchAbort?.abort();
        this.benchAbort = undefined;
        clearInterval(this.timer);
        this.timer = undefined;

        for (const slot of this.slots) {
            slot.main.quit();
            slot.opponent.quit();
        }
        this.slots = [];
    }

    // One worker: takes the next pairing off the pile until the run is done.
    private async runSlot(
        slot: Slot,
        index: number,
        setup: ArenaSetup,
        timeControl: TimeControl,
        book: string[],
    ): Promise<void> {
        while (!this.stopped && this.nextIndex < setup.games) {
            const game = this.nextIndex;
            this.nextIndex += 1;

            const opening = book[Math.floor(game / 2) % book.length] ?? new Chess().fen();
            const mainIsWhite = game % 2 === 0;

            const outcome = await this.playGame(slot, index, opening, mainIsWhite, timeControl);
            if (outcome === undefined) {
                return;
            }

            this.wins += outcome === "win" ? 1 : 0;
            this.draws += outcome === "draw" ? 1 : 0;
            this.losses += outcome === "loss" ? 1 : 0;
            this.publish();
        }
    }

    private async playGame(
        slot: Slot,
        index: number,
        opening: string,
        mainIsWhite: boolean,
        timeControl: TimeControl,
    ): Promise<Outcome | undefined> {
        const board = new Chess(opening);
        const clocks: Record<Colour, number> = { w: timeControl.baseMs, b: timeControl.baseMs };
        const engines: Record<Colour, UciEngine> = mainIsWhite
            ? { w: slot.main, b: slot.opponent }
            : { w: slot.opponent, b: slot.main };

        const tile = this.games[index];
        if (tile) {
            tile.fen = board.fen();
            tile.whiteVersion = mainIsWhite ? this.mainVersion : this.opponentVersion;
            tile.blackVersion = mainIsWhite ? this.opponentVersion : this.mainVersion;
            tile.clocks = { ...clocks };
            tile.moveNumber = board.moveNumber();
            tile.lastMove = undefined;
            tile.result = undefined;
        }

        try {
            await engines.w.newGame();
            await engines.b.newGame();
        } catch {
            return undefined;
        }

        const moves: string[] = [];
        let result: string | undefined;

        while (result === undefined) {
            if (this.stopped) {
                return undefined;
            }
            if (board.isGameOver()) {
                result = board.isCheckmate() ? (board.turn() === "w" ? "0-1" : "1-0") : "1/2-1/2";
                break;
            }
            if (board.moveNumber() * 2 >= MAX_PLIES) {
                result = "1/2-1/2";
                break;
            }

            const mover = board.turn();
            const startedAt = Date.now();

            let best: string;
            try {
                best = await engines[mover].search(
                    opening,
                    moves,
                    {
                        wtimeMs: clocks.w,
                        btimeMs: clocks.b,
                        wincMs: timeControl.incrementMs,
                        bincMs: timeControl.incrementMs,
                    },
                    () => undefined, // the tiles show the board, not the search
                );
            } catch {
                return undefined;
            }

            const spent = Date.now() - startedAt;
            clocks[mover] -= spent;
            if (clocks[mover] <= 0) {
                result = mover === "w" ? "0-1" : "1-0";
                break;
            }
            clocks[mover] += timeControl.incrementMs;

            let move;
            try {
                move = board.move({
                    from: best.slice(0, 2),
                    to: best.slice(2, 4),
                    promotion: best.length > 4 ? best[4] : undefined,
                });
            } catch {
                result = mover === "w" ? "0-1" : "1-0"; // an illegal move loses the game
                break;
            }

            moves.push(best);
            if (tile) {
                tile.fen = board.fen();
                tile.clocks = { ...clocks };
                tile.moveNumber = board.moveNumber();
                tile.lastMove = { from: move.from, to: move.to };
            }
        }

        if (tile) {
            tile.result = result;
        }

        if (result === "1/2-1/2") {
            return "draw";
        }
        return (result === "1-0") === mainIsWhite ? "win" : "loss";
    }

    private finish(timeControl: TimeControl): void {
        clearInterval(this.timer);
        this.timer = undefined;
        this.phase = "finished";

        for (const slot of this.slots) {
            slot.main.quit();
            slot.opponent.quit();
        }
        this.slots = [];

        const score = this.state().score;
        if (score.played > 0) {
            const run: RunSummary = {
                finishedAt: new Date().toISOString(),
                main: this.mainVersion || (this.setup?.mainId ?? "?"),
                opponent: this.opponentVersion || (this.setup?.opponentId ?? "?"),
                games: score.played,
                wins: score.wins,
                draws: score.draws,
                losses: score.losses,
                elo: Math.round(score.elo * 10) / 10,
                error: Math.round(score.error * 10) / 10,
                llr: Math.round(score.llr * 100) / 100,
                verdict: score.verdict,
                timeControl: timeControl.name,
                nps: this.bench?.nps,
                nodes: this.bench?.nodes,
                depth: this.bench?.depth,
            };
            this.send({ type: "runs", runs: appendRun(run) });
        }

        this.publish();
    }
}

function emptyGame(id: number): ArenaGame {
    return {
        id,
        fen: new Chess().fen(),
        whiteVersion: "",
        blackVersion: "",
        clocks: { w: 0, b: 0 },
        moveNumber: 1,
    };
}
