import type { EngineSnapshot, GameState } from "../../../shared/protocol.js";
import { averageMoveTime, formatNodes, formatScore, lastMoveTime, scoreTone } from "../lib/format.js";
import { MetricTile } from "./ui/MetricTile.js";
import { Panel } from "./ui/Panel.js";

interface Props {
    snapshot: EngineSnapshot | null;
    state: GameState | null;
}

export function SearchPanel({ snapshot, state }: Props) {
    const line = snapshot?.lines[0];
    const mover = snapshot?.colour ?? state?.turn ?? "w";
    const moves = state?.moves ?? [];

    const aside = snapshot ? (
        <span className="dim" style={{ fontSize: 11 }}>
            {snapshot.version} · {snapshot.colour === "w" ? "white" : "black"}
        </span>
    ) : undefined;

    return (
        <Panel title="Search" aside={aside}>
            <div className="metrics">
                <MetricTile label="Eval" value={formatScore(line, mover)} tone={scoreTone(line, mover)} />
                <MetricTile label="Depth" value={line ? String(line.depth) : "—"} />
                <MetricTile label="Nodes" value={line ? formatNodes(line.nodes) : "—"} />
                <MetricTile label="NPS" value={line ? formatNodes(line.nps) : "—"} />
                <MetricTile label="Last move" value={lastMoveTime(moves)} />
                <MetricTile label="Avg / move" value={averageMoveTime(moves, snapshot?.colour ?? null)} />
            </div>
        </Panel>
    );
}
