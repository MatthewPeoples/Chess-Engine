import { Chess } from "chess.js";

import type { MoveRecord } from "../../../shared/protocol.js";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function applyUci(chess: Chess, uci: string): boolean {
    if (uci.length < 4) {
        return false;
    }
    try {
        chess.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.length > 4 ? uci[4] : undefined,
        });
        return true;
    } catch {
        return false;
    }
}

export function fenAtPly(moves: MoveRecord[], ply: number): string {
    const chess = new Chess(START_FEN);
    for (let i = 0; i < ply && i < moves.length; i += 1) {
        if (!applyUci(chess, moves[i]!.uci)) {
            break;
        }
    }
    return chess.fen();
}

export function lastMoveAtPly(moves: MoveRecord[], ply: number): { from: string; to: string } | undefined {
    if (ply <= 0) {
        return undefined;
    }
    const uci = moves[ply - 1]?.uci;
    if (!uci || uci.length < 4) {
        return undefined;
    }
    return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}
