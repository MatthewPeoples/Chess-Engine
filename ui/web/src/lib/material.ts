// Display-only material counts derived from the starting position, independent of engine evaluation.

const STARTING: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
export const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

export interface Captured {
    // Lowercase pieces captured by White, most valuable first.
    byWhite: string[];
    byBlack: string[];
    // Positive when White is ahead by this many material points.
    advantage: number;
}

export function capturedMaterial(fen: string): Captured {
    const placement = fen.split(" ")[0] ?? "";
    const counts: Record<string, number> = {};

    for (const character of placement) {
        if (/[pnbrqPNBRQ]/.test(character)) {
            counts[character] = (counts[character] ?? 0) + 1;
        }
    }

    const byWhite: string[] = [];
    const byBlack: string[] = [];
    let advantage = 0;

    for (const piece of ["q", "r", "b", "n", "p"]) {
        const whiteLeft = counts[piece.toUpperCase()] ?? 0;
        const blackLeft = counts[piece] ?? 0;
        const start = STARTING[piece] ?? 0;

        for (let i = 0; i < start - blackLeft; i += 1) {
            byWhite.push(piece);
        }
        for (let i = 0; i < start - whiteLeft; i += 1) {
            byBlack.push(piece);
        }
        advantage += (whiteLeft - blackLeft) * (PIECE_VALUES[piece] ?? 0);
    }

    return { byWhite, byBlack, advantage };
}

export const PIECE_GLYPHS: Record<string, string> = {
    p: "♟",
    n: "♞",
    b: "♝",
    r: "♜",
    q: "♛",
};
