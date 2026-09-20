// An opening book. The engine is deterministic, so without one every parallel game would be the
// same game: same position, same clock, same move. Generated once with a fixed seed and kept on
// disk, so every run and every clone starts from the same 500 positions

import fs from "node:fs";
import path from "node:path";

import { Chess } from "chess.js";

const DATA = path.resolve(import.meta.dirname, "../data");
const FILE = path.join(DATA, "book.json");
const POSITIONS = 500;
const PLIES = 8;

// Small deterministic generator, so the book is reproducible
function random(seed: number): () => number {
    let state = seed;
    return () => {
        state |= 0;
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function material(board: Chess, colour: "w" | "b"): number {
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    return Object.entries(values).reduce(
        (total, [piece, value]) => total + value * board.findPiece({ type: piece as never, color: colour }).length,
        0,
    );
}

function generate(): string[] {
    const next = random(20260920);
    const seen = new Set<string>();

    while (seen.size < POSITIONS) {
        const board = new Chess();
        let usable = true;

        for (let ply = 0; ply < PLIES; ply += 1) {
            const moves = board.moves({ verbose: true });
            if (moves.length === 0) {
                usable = false;
                break;
            }
            board.move(moves[Math.floor(next() * moves.length)]!);
        }

        // a position that is already lopsided or in check is not a fair place to start
        if (usable && !board.isCheck() && board.moves().length > 0 && material(board, "w") === material(board, "b")) {
            seen.add(board.fen());
        }
    }

    return [...seen];
}

export function openingBook(): string[] {
    if (fs.existsSync(FILE)) {
        return JSON.parse(fs.readFileSync(FILE, "utf8")) as string[];
    }

    const book = generate();
    fs.mkdirSync(DATA, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(book, null, 0));
    return book;
}
