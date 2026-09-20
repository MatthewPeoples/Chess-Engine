import { Chess } from "chess.js";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Chessboard, type PieceDropHandlerArgs, type SquareHandlerArgs } from "react-chessboard";

import type { Colour, EngineSnapshot, GameState } from "../../../shared/protocol.js";
import { whiteScore } from "../lib/format.js";
import { capturedMaterial } from "../lib/material.js";
import { fenAtPly, lastMoveAtPly } from "../lib/replay.js";
import { EvalBar } from "./EvalBar.js";
import { PlayerBanner } from "./PlayerBanner.js";
import { Button } from "./ui/Button.js";

interface Props {
    state: GameState | null;
    engine: EngineSnapshot | null;
    clocks: Record<Colour, number>;
    onMove: (from: string, to: string, promotion?: string) => void;
    onNewGame: () => void;
    onBack: () => void;
    onForward: () => void;
    onResign: () => void;
    onSetPause: (paused: boolean) => void;
}

function readShowEvalBar(): boolean {
    try {
        return localStorage.getItem("showEvalBar") !== "0";
    } catch {
        return true;
    }
}

// Smaller than the library defaults so notation stays clear of piece artwork.
const BOARD_ALPHA_NOTATION: CSSProperties = {
    fontSize: 11,
    position: "absolute",
    bottom: 0,
    right: 2,
    userSelect: "none",
    lineHeight: 1,
};
const BOARD_NUMERIC_NOTATION: CSSProperties = {
    fontSize: 11,
    position: "absolute",
    top: 1,
    left: 1,
    userSelect: "none",
    lineHeight: 1,
};

export function BoardPanel({
    state,
    engine,
    clocks,
    onMove,
    onNewGame,
    onBack,
    onForward,
    onResign,
    onSetPause,
}: Props) {
    const paused = state?.paused === true;
    const moves = state?.moves ?? [];
    const livePly = moves.length;
    const [viewPly, setViewPly] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);
    const [premove, setPremove] = useState<{ from: string; to: string } | null>(null);
    const [flipped, setFlipped] = useState(false);
    const [showEvalBar, setShowEvalBar] = useState(readShowEvalBar);

    const atLive = viewPly === livePly;
    const fen = useMemo(() => fenAtPly(moves, viewPly), [moves, viewPly]);
    const displayLastMove = useMemo(() => lastMoveAtPly(moves, viewPly), [moves, viewPly]);

    const board = useMemo(() => new Chess(fen), [fen]);

    // New moves return the view to live play; takebacks clamp it to the remaining history.
    useEffect(() => {
        setViewPly((view) => {
            if (livePly > view) {
                return livePly;
            }
            return Math.min(view, livePly);
        });
    }, [moves, livePly]);

    useEffect(() => {
        if (!atLive) {
            setSelected(null);
            setPromotion(null);
        }
    }, [atLive, viewPly]);

    const humanColour: Colour | null = state
        ? state.players.w.kind === "human"
            ? "w"
            : state.players.b.kind === "human"
                ? "b"
                : null
        : "w";
    const watching = humanColour === null;
    const humansTurn = state?.status === "playing" && state.turn === humanColour && atLive;
    const myTurn = humansTurn && !paused;
    const interactionBoard = useMemo(() => {
        if (humansTurn || !humanColour || state?.status !== "playing") {
            return board;
        }

        const fields = fen.split(" ");
        fields[1] = humanColour;
        fields[3] = "-";
        try {
            return new Chess(fields.join(" "));
        } catch {
            return board;
        }
    }, [board, fen, humanColour, humansTurn, state?.status]);
    const canTakeBack =
        atLive && myTurn && livePly > 0 && !watching && state?.status === "playing" && !paused;
    const canReplayTakeback =
        atLive && myTurn && !watching && state?.status === "playing" && !paused;
    const canGoBack = viewPly > 0 || canTakeBack;
    const canGoForward = viewPly < livePly || canReplayTakeback;

    const handleBack = () => {
        setPremove(null);
        if (canTakeBack) {
            onBack();
            return;
        }
        if (viewPly > 0) {
            setViewPly((ply) => ply - 1);
        }
    };

    const handleForward = () => {
        if (viewPly < livePly) {
            setViewPly((ply) => ply + 1);
            return;
        }
        if (canReplayTakeback) {
            onForward();
        }
    };
    const orientation: "white" | "black" = (humanColour === "b" ? !flipped : flipped) ? "black" : "white";

    const captured = capturedMaterial(fen);
    const score = whiteScore(engine?.lines[0], engine?.colour ?? "w");

    // Execute a queued premove after the engine reply, unless the resulting position makes it illegal.
    useEffect(() => {
        if (!premove || !myTurn) {
            return;
        }
        const legal = board.moves({ square: premove.from as never, verbose: true }).some((m) => m.to === premove.to);
        setPremove(null);
        if (legal) {
            onMove(premove.from, premove.to);
        }
    }, [board, myTurn, onMove, premove]);

    const legalTargets = useMemo(() => {
        if (!selected) {
            return new Set<string>();
        }
        return new Set(interactionBoard.moves({ square: selected as never, verbose: true }).map((move) => move.to));
    }, [interactionBoard, selected]);

    const squareStyles = useMemo(() => {
        const styles: Record<string, CSSProperties> = {};

        if (displayLastMove) {
            styles[displayLastMove.from] = { background: "var(--hl-last)" };
            styles[displayLastMove.to] = { background: "var(--hl-last)" };
        }
        if (selected) {
            styles[selected] = { background: "var(--hl-sel)" };
        }
        for (const square of legalTargets) {
            const occupied = board.get(square as never);
            styles[square] = occupied
                ? { ...styles[square], boxShadow: "inset 0 0 0 4px var(--hl-legal)" }
                : {
                    ...styles[square],
                    background: "radial-gradient(circle, var(--hl-legal) 26%, transparent 27%)",
                };
        }
        if (premove) {
            for (const square of [premove.from, premove.to]) {
                styles[square] = { ...styles[square], boxShadow: "inset 0 0 0 4px var(--hl-pre)" };
            }
        }
        return styles;
    }, [board, displayLastMove, legalTargets, premove, selected]);

    const promotes = (from: string, to: string) =>
        board.get(from as never)?.type === "p" && (to.endsWith("8") || to.endsWith("1"));

    const tryMove = (from: string, to: string) => {
        if (state?.status !== "playing" || watching || !atLive) {
            return false;
        }

        // Queue moves made during the engine's turn as premoves.
        if (!humansTurn) {
            const mine = board.get(from as never)?.color === humanColour;
            const legal = interactionBoard
                .moves({ square: from as never, verbose: true })
                .some((move) => move.to === to);
            if (mine && legal) {
                if (paused) {
                    onSetPause(false);
                }
                setPremove({ from, to });
                setSelected(null);
                return true;
            }
            return false;
        }

        if (!board.moves({ square: from as never, verbose: true }).some((move) => move.to === to)) {
            return false;
        }
        if (promotes(from, to)) {
            setPromotion({ from, to });
            setSelected(null);
            return true;
        }

        if (paused) {
            onSetPause(false);
        }
        onMove(from, to);
        setSelected(null);
        return true;
    };

    const onPieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) =>
        targetSquare ? tryMove(sourceSquare, targetSquare) : false;

    const onSquareClick = ({ square, piece }: SquareHandlerArgs) => {
        if (premove) {
            setPremove(null);
            return;
        }
        if (selected && tryMove(selected, square)) {
            return;
        }
        setSelected(
            piece && atLive && !watching && piece.pieceType[0]?.toLowerCase() === humanColour ? square : null,
        );
    };

    const top: Colour = orientation === "white" ? "b" : "w";
    const bottom: Colour = orientation === "white" ? "w" : "b";

    return (
        <div className="board-column">
            <PlayerBanner
                state={state}
                colour={top}
                clock={clocks[top]}
                captured={top === "w" ? captured.byWhite : captured.byBlack}
                advantage={top === "w" ? captured.advantage : -captured.advantage}
                thinking={engine?.thinking === true && engine.colour === top}
            />

            <div className="board-row">
                <EvalBar
                    score={score}
                    flipped={orientation === "black"}
                    hidden={!watching && !showEvalBar}
                />

                <div className="board">
                    <Chessboard
                        options={{
                            id: "play-board",
                            position: fen,
                            boardOrientation: orientation,
                            allowDragging: state?.status === "playing" && !watching && atLive,
                            onPieceDrop,
                            onSquareClick,
                            squareStyles,
                            animationDurationInMs: 150,
                            darkSquareStyle: { backgroundColor: "var(--sq-d)" },
                            lightSquareStyle: { backgroundColor: "var(--sq-l)" },
                            alphaNotationStyle: BOARD_ALPHA_NOTATION,
                            numericNotationStyle: BOARD_NUMERIC_NOTATION,
                        }}
                    />

                    {promotion && (
                        <div className="promotion">
                            <p className="label" style={{ margin: 0 }}>
                                Promote to
                            </p>
                            <div className="promotion-row">
                                {["q", "r", "b", "n"].map((piece) => (
                                    <Button
                                        key={piece}
                                        onClick={() => {
                                            if (paused) {
                                                onSetPause(false);
                                            }
                                            onMove(promotion.from, promotion.to, piece);
                                            setPromotion(null);
                                        }}
                                    >
                                        {piece.toUpperCase()}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {state?.result && (
                        <div className="board-badge">
                            {state.result.text}
                            <span>{state.result.reason}</span>
                        </div>
                    )}
                </div>
            </div>

            <PlayerBanner
                state={state}
                colour={bottom}
                clock={clocks[bottom]}
                captured={bottom === "w" ? captured.byWhite : captured.byBlack}
                advantage={bottom === "w" ? captured.advantage : -captured.advantage}
                thinking={engine?.thinking === true && engine.colour === bottom}
            />

            <div className="controls-row">
                <Button onClick={onNewGame}>Start game</Button>
                {!watching && (
                    <>
                        <Button variant="secondary" icon onClick={handleBack} disabled={!canGoBack} aria-label="Back">
                            ←
                        </Button>
                        <Button variant="secondary" icon onClick={handleForward} disabled={!canGoForward} aria-label="Forward">
                            →
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => onSetPause(!paused)}
                            disabled={state?.status !== "playing"}
                        >
                            {paused ? "Resume" : "Pause"}
                        </Button>
                        <Button variant="danger" onClick={onResign} disabled={state?.status !== "playing"}>
                            Resign
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowEvalBar((on) => {
                                    const next = !on;
                                    try {
                                        localStorage.setItem("showEvalBar", next ? "1" : "0");
                                    } catch {}
                                    return next;
                                });
                            }}
                        >
                            {showEvalBar ? "Hide eval" : "Show eval"}
                        </Button>
                    </>
                )}
                {watching && (
                    <Button variant="secondary" onClick={() => setFlipped((current) => !current)}>
                        Flip board
                    </Button>
                )}

                <div className="spacer" />
            </div>
        </div>
    );
}
