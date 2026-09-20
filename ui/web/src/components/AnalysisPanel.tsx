import type { EngineSnapshot, GameState } from "../../../shared/protocol.js";
import { formatScore, scoreTone } from "../lib/format.js";
import { Panel } from "./ui/Panel.js";

interface Props {
    snapshot: EngineSnapshot | null;
    state: GameState | null;
}

// Reserved rows prevent layout shifts and leave room for future MultiPV lines.
export function AnalysisPanel({ snapshot, state }: Props) {
    const lines = snapshot?.lines ?? [];
    const mover = snapshot?.colour ?? state?.turn ?? "w";

    return (
        <Panel title="Analysis">
            <div className="analysis">
                {lines.map((line) => (
                    <div key={line.multipv} className="analysis-line">
                        <span className={`analysis-score ${scoreTone(line, mover) ?? ""}`}>
                            {formatScore(line, mover)}
                        </span>
                        <span className="analysis-moves">
                            {(line.pvSan.length > 0 ? line.pvSan : line.pvUci).join(" ")}
                        </span>
                    </div>
                ))}

                {lines.length === 0 && <div className="analysis-reserved">waiting for the engine to think</div>}

                {[2, 3].slice(0, 3 - Math.max(lines.length, 1)).map((n) => (
                    <div key={n} className="analysis-reserved">
                        line {n} — reserved for multipv
                    </div>
                ))}
            </div>
        </Panel>
    );
}
