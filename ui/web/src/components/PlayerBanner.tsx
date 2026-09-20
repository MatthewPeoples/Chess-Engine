import type { Colour, GameState } from "../../../shared/protocol.js";
import { formatClock } from "../lib/format.js";
import { PIECE_GLYPHS } from "../lib/material.js";

interface Props {
    state: GameState | null;
    colour: Colour;
    clock: number;
    captured: string[];
    advantage: number;
    thinking: boolean;
}

export function PlayerBanner({ state, colour, clock, captured, advantage, thinking }: Props) {
    const player = state?.players[colour];
    const active = state?.status === "playing" && state.turn === colour;
    const name = player?.kind === "human" ? "You" : (player?.version ?? "Engine");

    return (
        <div className={`banner ${active ? "active" : ""}`}>
            <div className="banner-left">
                <span className={`side-dot ${colour}`} />
                <span className="banner-name">{name}</span>

                <span className="captured">
                    {captured.map((piece, index) => (
                        <span key={`${piece}-${index}`}>{PIECE_GLYPHS[piece]}</span>
                    ))}
                    {advantage > 0 && <span className="captured-score">+{advantage}</span>}
                </span>

                {thinking && active && <span className="thinking-label">thinking</span>}
            </div>

            <div className={`clock ${clock < 20_000 ? "low" : ""}`}>{formatClock(clock)}</div>
        </div>
    );
}
