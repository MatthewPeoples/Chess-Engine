import type { RunSummary } from "../../../shared/protocol.js";
import { cumulativeElo } from "../lib/elo.js";
import { exportResultsCard } from "../lib/exportCard.js";
import { formatNodes } from "../lib/format.js";
import { Button } from "./ui/Button.js";

interface Props {
    runs: RunSummary[];
}

export function ResultsView({ runs }: Props) {
    if (runs.length === 0) {
        return (
            <div className="empty">
                <strong>No runs yet</strong>
                The Elo chart and the run history appear here after the first arena finishes.
            </div>
        );
    }

    const newest = [...runs].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
    const games = runs.reduce((total, run) => total + run.games, 0);

    return (
        <div className="results">
            <div className="results-head">
                <h1 className="results-title">Benchmark history</h1>
                <span className="dim">
                    {runs.length} run{runs.length === 1 ? "" : "s"} · {games.toLocaleString()} games
                </span>
                <div className="spacer" />
                <Button onClick={() => exportResultsCard(runs)}>Export PNG</Button>
            </div>

            <EloChart runs={runs} />
            <SpeedChart runs={runs} />

            <section className="panel table-panel">
                <div className="run-row head">
                    <span className="label">Finished</span>
                    <span className="label">Main</span>
                    <span className="label">Opponent</span>
                    <span className="label right">Games</span>
                    <span className="label right">Score</span>
                    <span className="label right">Elo</span>
                    <span className="label right">NPS</span>
                    <span className="label right">TC</span>
                    <span className="label right">Verdict</span>
                </div>

                {newest.map((run) => (
                    <div className="run-row tabular" key={`${run.finishedAt}-${run.main}`}>
                        <span className="dim">{run.finishedAt.replace("T", " ").slice(0, 16)}</span>
                        <span className="strong">{run.main}</span>
                        <span>{run.opponent}</span>
                        <span className="right">{run.games}</span>
                        <span className="right">
                            {(((run.wins + run.draws / 2) / Math.max(run.games, 1)) * 100).toFixed(1)}%
                        </span>
                        <span className={`right strong ${run.elo >= 0 ? "good" : "bad"}`}>
                            {run.elo >= 0 ? "+" : "−"}
                            {Math.abs(run.elo).toFixed(0)} <span className="dim">± {run.error.toFixed(0)}</span>
                        </span>
                        <span className="right dim">{run.nps ? formatNodes(run.nps) : "—"}</span>
                        <span className="right dim">{run.timeControl}</span>
                        <span className={`right verdict ${run.verdict}`}>{run.verdict}</span>
                    </div>
                ))}
            </section>
        </div>
    );
}

function EloChart({ runs }: Props) {
    const points = cumulativeElo(runs);
    if (points.length < 2) {
        return null;
    }

    const values = points.map((point) => point.elo);
    const errors = points.map((point) => point.error);
    const low = Math.min(...values.map((value, index) => value - (errors[index] ?? 0))) - 20;
    const high = Math.max(...values.map((value, index) => value + (errors[index] ?? 0))) + 20;

    const x = (index: number) => 60 + (index * 700) / Math.max(points.length - 1, 1);
    const y = (value: number) => 30 + 220 - ((value - low) / Math.max(high - low, 1)) * 220;

    return (
        <section className="panel chart-panel">
            <div className="panel-head">
                <span className="label">Elo, cumulative, with 95% margin</span>
                <span className="dim">baseline = 0</span>
            </div>

            <svg viewBox="0 0 800 300" className="chart" role="img" aria-label="Elo across versions">
                <line x1="60" y1={y(0)} x2="760" y2={y(0)} stroke="var(--line-strong)" />
                <polyline
                    points={points.map((point, index) => `${x(index)},${y(point.elo)}`).join(" ")}
                    fill="none"
                    stroke="var(--good)"
                    strokeWidth="2"
                />
                {points.map((point, index) => (
                    <g key={point.version}>
                        {point.error > 0 && (
                            <line
                                x1={x(index)}
                                y1={y(point.elo - point.error)}
                                x2={x(index)}
                                y2={y(point.elo + point.error)}
                                stroke="var(--text)"
                                strokeWidth="2"
                                opacity="0.5"
                            />
                        )}
                        <circle cx={x(index)} cy={y(point.elo)} r="4" fill="var(--good)" />
                        <text x={x(index)} y={y(point.elo) - 14} className="chart-value" textAnchor="middle">
                            {point.elo >= 0 ? "+" : "−"}
                            {Math.abs(point.elo).toFixed(0)}
                        </text>
                        <text x={x(index)} y="288" className="chart-label" textAnchor="middle">
                            {point.version}
                        </text>
                    </g>
                ))}
            </svg>
        </section>
    );
}

// Speed is its own chart on purpose. A transposition table makes an engine stronger and slower
// at the same time, so plotting the two together would read as a contradiction
function SpeedChart({ runs }: Props) {
    const measured = runs.filter((run) => run.nps !== undefined);
    if (measured.length < 2) {
        return null;
    }

    const top = Math.max(...measured.map((run) => run.nps ?? 0)) * 1.15;
    const width = 700 / measured.length;

    return (
        <section className="panel chart-panel">
            <div className="panel-head">
                <span className="label">Bench speed, nodes per second</span>
                <span className="dim">depth {measured[0]?.depth ?? "—"}, fixed positions</span>
            </div>

            <svg viewBox="0 0 800 200" className="chart" role="img" aria-label="Nodes per second by version">
                {measured.map((run, index) => {
                    const height = ((run.nps ?? 0) / top) * 150;
                    return (
                        <g key={`${run.finishedAt}-speed`}>
                            <rect
                                x={60 + index * width + width * 0.2}
                                y={170 - height}
                                width={width * 0.6}
                                height={height}
                                fill="var(--accent)"
                                rx="3"
                            />
                            <text
                                x={60 + index * width + width * 0.5}
                                y={170 - height - 8}
                                className="chart-value"
                                textAnchor="middle"
                            >
                                {formatNodes(run.nps ?? 0)}
                            </text>
                            <text x={60 + index * width + width * 0.5} y="190" className="chart-label" textAnchor="middle">
                                {run.main}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </section>
    );
}
