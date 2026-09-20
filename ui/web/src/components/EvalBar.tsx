interface Props {
    score: number | null; // Centipawns from White's point of view.
    flipped: boolean;
    // Preserves the bar's layout width while hiding its contents.
    hidden?: boolean;
}

// Clamp the visual at four pawns; the metrics retain the exact score.
export function EvalBar({ score, flipped, hidden = false }: Props) {
    const clamped = Math.max(-400, Math.min(400, score ?? 0));
    const whiteShare = score === null ? 50 : 50 + (clamped / 400) * 50;
    const topShare = flipped ? whiteShare : 100 - whiteShare;

    return (
        <div className={`eval-bar${hidden ? " eval-bar-hidden" : ""}`} aria-hidden={hidden}>
            {!hidden && (
                <>
                    <div className={flipped ? "eval-share-light" : "eval-share-dark"} style={{ height: `${topShare}%` }} />
                    <div
                        className={flipped ? "eval-share-dark" : "eval-share-light"}
                        style={{ height: `${100 - topShare}%` }}
                    />
                </>
            )}
        </div>
    );
}
