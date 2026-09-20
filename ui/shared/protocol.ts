export type Colour = "w" | "b";

export interface TimeControl {
    name: string;
    baseMs: number;
    incrementMs: number;
}

export const TIME_CONTROLS: TimeControl[] = [
    { name: "1+1", baseMs: 60_000, incrementMs: 1_000 },
    { name: "3+0", baseMs: 180_000, incrementMs: 0 },
    { name: "3+2", baseMs: 180_000, incrementMs: 2_000 },
    { name: "5+1", baseMs: 300_000, incrementMs: 1_000 },
];

export interface BuildInfo {
    id: string; // Directory under builds/, or "working" for build-release.
    label: string;
    path: string;
}

// One analysis line; the array shape supports future MultiPV output.
export interface EngineLine {
    multipv: number;
    depth: number;
    seldepth?: number;
    scoreCp?: number;
    scoreMate?: number;
    nodes: number;
    nps: number;
    timeMs: number;
    pvUci: string[];
    pvSan: string[];
}

export interface EngineSnapshot {
    colour: Colour;
    version: string;
    thinking: boolean;
    lines: EngineLine[];
}

export interface MoveRecord {
    san: string;
    uci: string;
    colour: Colour;
    msSpent: number;
}

export type GameStatus = "idle" | "playing" | "finished";

export interface PlayerInfo {
    kind: "human" | "engine";
    version: string | null;
}

export interface GameState {
    status: GameStatus;
    fen: string;
    turn: Colour;
    check: boolean;
    lastMove?: { from: string; to: string };
    moves: MoveRecord[];
    clocks: Record<Colour, number>;
    players: Record<Colour, PlayerInfo>;
    timeControl: TimeControl;
    // Human-vs-engine only; freezes clocks and engine moves.
    paused?: boolean;
    result?: { text: string; reason: string };
}

export interface PlayerSetup {
    kind: "human" | "engine";
    engineId?: string;
}

export type ClientMessage =
    | { type: "hello" }
    | { type: "new-game"; white: PlayerSetup; black: PlayerSetup; timeControl: string }
    | { type: "move"; from: string; to: string; promotion?: string }
    | { type: "takeback" }
    | { type: "forward" }
    | { type: "resign" }
    | { type: "set-pause"; paused: boolean };

export type ServerMessage =
    | { type: "builds"; builds: BuildInfo[]; timeControls: TimeControl[] }
    | { type: "state"; state: GameState }
    | { type: "engine"; snapshot: EngineSnapshot }
    | { type: "error"; message: string };

// Reserved wire contract for the arena runner; currently no producer sends these types.

export interface ArenaSetup {
    mainId: string;
    opponentId: string;
    games: number;
    parallel: number; // Valid range: 2–10.
    timeControl: string;
}

export interface ArenaGame {
    id: number;
    fen: string;
    whiteVersion: string;
    blackVersion: string;
    clocks: Record<Colour, number>;
    moveNumber: number;
    lastMove?: { from: string; to: string };
    result?: string; // "1-0", "1/2-1/2", or "0-1".
}

export interface ArenaScore {
    played: number;
    total: number;
    wins: number;
    draws: number;
    losses: number;
    elo: number;
    error: number;
    // Log-likelihood ratio between the two stopping bounds.
    llr: number;
    verdict: "accepted" | "rejected" | "undecided";
    gamesPerHour: number;
    elapsedMs: number;
    remainingMs: number;
}

export const LLR_BOUND = 2.94;

export interface RunSummary {
    finishedAt: string;
    main: string;
    opponent: string;
    games: number;
    wins: number;
    draws: number;
    losses: number;
    elo: number;
    error: number;
    llr: number;
    verdict: ArenaScore["verdict"];
    timeControl: string;
    // Populated after bench support exists; speed is independent of playing strength.
    nps?: number;
    nodes?: number;
    depth?: number;
}
