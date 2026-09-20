import { Chessboard } from "react-chessboard";

import type { ArenaGame } from "../../../shared/protocol.js";
import { formatClock } from "../lib/format.js";

interface Props {
    game: ArenaGame;
    compact: boolean;
}

// At the small size the move number and the two name rows collapse into one line under the
// board; the version names survive only in the matchup string
export function ArenaTile({ game, compact }: Props) {
    const squareStyles = game.lastMove
        ? {
            [game.lastMove.from]: { background: "var(--hl-last)" },
            [game.lastMove.to]: { background: "var(--hl-last)" },
        }
        : {};

    const board = (
        <div className="tile-board">
            <Chessboard
                options={{
                    id: `arena-${game.id}`,
                    position: game.fen,
                    allowDragging: false,
                    squareStyles,
                    animationDurationInMs: 150,
                    darkSquareStyle: { backgroundColor: "var(--sq-d)" },
                    lightSquareStyle: { backgroundColor: "var(--sq-l)" },
                }}
            />
            {game.result && <div className={`tile-badge ${compact ? "small" : ""}`}>{badge(game.result)}</div>}
        </div>
    );

    if (compact) {
        return (
            <div className="arena-tile compact">
                {board}
                <div className="tile-compact-row tabular">
                    <span>
                        <span className="side-dot w" />
                        {formatClock(game.clocks.w)}
                    </span>
                    <span className="tile-matchup">
                        {short(game.whiteVersion)}·{short(game.blackVersion)}
                    </span>
                    <span>
                        {formatClock(game.clocks.b)}
                        <span className="side-dot b" />
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="arena-tile">
            <div className="tile-row">
                <span>
                    <span className="side-dot b" />
                    {game.blackVersion || "—"}
                </span>
                <span className="tabular dim">{formatClock(game.clocks.b)}</span>
            </div>

            {board}

            <div className="tile-row">
                <span>
                    <span className="side-dot w" />
                    {game.whiteVersion || "—"}
                </span>
                <span className="tabular dim">{formatClock(game.clocks.w)}</span>
            </div>

            <div className="label">move {game.moveNumber}</div>
        </div>
    );
}

function badge(result: string): string {
    return result === "1/2-1/2" ? "½–½" : result === "1-0" ? "1–0" : "0–1";
}

function short(version: string): string {
    return version.replace("Chess-Engine ", "") || "—";
}
