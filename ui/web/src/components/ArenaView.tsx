import { useEffect, useState } from "react";

import { LLR_BOUND, type ArenaSetup, type ArenaState, type BuildInfo } from "../../../shared/protocol.js";
import { formatDuration, formatNodes } from "../lib/format.js";
import { ArenaTile } from "./ArenaTile.js";
import { Button } from "./ui/Button.js";

const ESTIMATE_SAMPLE_MS = 10_000;

interface Props {
    arena: ArenaState | null;
    builds: BuildInfo[];
    onOpenSetup: () => void;
    onStop: () => void;
}

export function ArenaView({ arena, builds, onOpenSetup, onStop }: Props) {
    const remainingMs = useRemainingCountdown(arena);

    if (!arena || arena.phase === "idle") {
        return (
            <div className="empty">
                <strong>No run in progress</strong>
                Pick a version and an opponent, and watch them play it out. The score, the Elo and the verdict update
                as the games finish.
                <div className="empty-action">
                    <Button onClick={onOpenSetup} disabled={builds.length === 0}>
                        Start arena
                    </Button>
                </div>
                {builds.length === 0 && (
                    <p className="dim">
                        No versions to compare yet — build one with <code>./scripts/build-version.sh v1.0</code>
                    </p>
                )}
            </div>
        );
    }

    const { score, setup } = arena;
    const running = arena.phase === "playing" || arena.phase === "bench";
    const percent = (value: number) => (score.played === 0 ? 0 : (value / score.played) * 100);
    const llrShare = Math.min(Math.abs(score.llr) / LLR_BOUND, 1) * 50;
    const boardCount = Math.min(Math.max(arena.games.length, 2), 8);
    const compact = boardCount > 4;

    return (
        <div className="arena">
            <div className="arena-head">
                <h1 className="arena-title">
                    {arena.mainVersion || setup?.mainId} <span className="dim">vs</span>{" "}
                    {arena.opponentVersion || setup?.opponentId}
                </h1>
                <span className="label">
                    {setup?.timeControl} · {setup?.parallel} in parallel · random book, colours swapped
                </span>
                <div className="spacer" />
                <Button variant="secondary" onClick={onOpenSetup} disabled={running}>
                    {running ? "Running" : "Start arena"}
                </Button>
                <Button variant="danger" onClick={onStop} disabled={!running}>
                    Stop
                </Button>
            </div>

            {running && score.played === 0 && (
                <p className="dim arena-phase">
                    Preparing the engines… At 8 games in parallel, startup can take 2–4 minutes depending on your
                    computer.
                </p>
            )}
            {arena.phase === "stopped" && (
                <p className="arena-phase">
                    <strong>Arena stopped.</strong>{" "}
                    {score.played === 0 ? "No games were started." : "Completed results have been kept."}
                </p>
            )}

            <div className="arena-score">
                <section className="panel">
                    <div className="panel-head">
                        <span className="label">Games</span>
                        <span className="tabular dim">
                            {score.played} / {score.total}
                        </span>
                    </div>
                    <div className="wdl">
                        <div>
                            <div className="wdl-figure good">{score.wins}</div>
                            <div className="label">win {percent(score.wins).toFixed(1)}%</div>
                        </div>
                        <div>
                            <div className="wdl-figure">{score.draws}</div>
                            <div className="label">draw {percent(score.draws).toFixed(1)}%</div>
                        </div>
                        <div>
                            <div className="wdl-figure bad">{score.losses}</div>
                            <div className="label">loss {percent(score.losses).toFixed(1)}%</div>
                        </div>
                    </div>
                    <div className="wdl-bar">
                        <div className="wdl-win" style={{ width: `${percent(score.wins)}%` }} />
                        <div className="wdl-draw" style={{ width: `${percent(score.draws)}%` }} />
                        <div className="wdl-loss" style={{ width: `${percent(score.losses)}%` }} />
                    </div>
                </section>

                <section className="panel elo-panel">
                    <span className="label">Elo of {arena.mainVersion || "main"}, relative to the opponent</span>
                    <div className="elo-figure">
                        <span className={`tabular ${score.elo >= 0 ? "good" : "bad"}`}>
                            {score.elo >= 0 ? "+" : "−"}
                            {Math.abs(score.elo).toFixed(0)}
                        </span>
                        <span className="tabular dim elo-error">± {score.error.toFixed(0)}</span>
                    </div>
                    <span className="dim">
                        score {(((score.wins + score.draws / 2) / Math.max(score.played, 1)) * 100).toFixed(1)}% · 95%
                        confidence
                    </span>
                </section>

                <section className="panel rate-panel">
                    <div>
                        <div className="label">Games / hour</div>
                        <div className="rate-value tabular">{score.gamesPerHour.toFixed(0)}</div>
                    </div>
                    <div>
                        <div className="label">Elapsed</div>
                        <div className="rate-value tabular">{formatDuration(score.elapsedMs)}</div>
                    </div>
                    <div>
                        <div className="label">Remaining</div>
                        <div className="rate-value tabular">{formatDuration(remainingMs)}</div>
                    </div>
                    <div>
                        <div className="label">Bench</div>
                        <div className="rate-value tabular">{arena.bench ? formatNodes(arena.bench.nps) : "—"}</div>
                    </div>
                </section>
            </div>

            <section className="panel">
                <div className="panel-head">
                    <span className="label">
                        Sequential test · −{LLR_BOUND} reject · +{LLR_BOUND} accept
                    </span>
                    <span className={`chip ${score.verdict}`}>
                        {score.verdict === "undecided" && <span className="chip-dot" />}
                        {score.verdict}
                    </span>
                </div>

                <div className="llr">
                    <div className="llr-centre" />
                    <div
                        className={`llr-fill ${score.llr >= 0 ? "positive" : "negative"}`}
                        style={{ width: `${llrShare}%`, [score.llr >= 0 ? "left" : "right"]: "50%" }}
                    />
                </div>
                <div className="llr-labels tabular">
                    <span className="dim">−{LLR_BOUND}</span>
                    <span className={score.llr >= 0 ? "good" : "bad"}>LLR {score.llr.toFixed(2)}</span>
                    <span className="dim">+{LLR_BOUND}</span>
                </div>
                <p className="dim llr-note">
                    How strongly the games so far favour the main version. In between the bounds means there is not
                    enough evidence yet.
                </p>
            </section>

            <div className="section-rule">
                <span className="label">Live boards</span>
                <span className="rule" />
            </div>

            <div className={`arena-grid boards-${boardCount} ${compact ? "compact" : ""}`}>
                {arena.games.map((game) => (
                    <ArenaTile key={game.id} game={game} compact={compact} />
                ))}
            </div>
        </div>
    );
}

interface RemainingSample {
    remainingMs: number;
    sampledAt: number;
    played: number;
    total: number;
}

function useRemainingCountdown(arena: ArenaState | null): number {
    const [sample, setSample] = useState<RemainingSample>({
        remainingMs: 0,
        sampledAt: 0,
        played: 0,
        total: 0,
    });

    useEffect(() => {
        const score = arena?.score;
        if (!score || arena.phase !== "playing" || score.remainingMs <= 0) {
            setSample({ remainingMs: 0, sampledAt: 0, played: score?.played ?? 0, total: score?.total ?? 0 });
            return;
        }

        const now = Date.now();
        setSample((current) => {
            const newRun = score.played < current.played || score.total !== current.total;
            if (!newRun && current.sampledAt > 0 && now - current.sampledAt < ESTIMATE_SAMPLE_MS) {
                return current;
            }
            return {
                remainingMs: score.remainingMs,
                sampledAt: now,
                played: score.played,
                total: score.total,
            };
        });
    }, [arena?.phase, arena?.score.played, arena?.score.remainingMs, arena?.score.total]);

    if (arena?.phase !== "playing" || sample.sampledAt === 0) {
        return arena?.score.remainingMs ?? 0;
    }
    return Math.max(0, sample.remainingMs - (Date.now() - sample.sampledAt));
}
