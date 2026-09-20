import type { MoveRecord } from "../../../shared/protocol.js";
import { Panel } from "./ui/Panel.js";

interface Props {
    moves: MoveRecord[];
}

export function MoveList({ moves }: Props) {
    const pairs: { number: number; white?: MoveRecord; black?: MoveRecord }[] = [];

    moves.forEach((move, index) => {
        const pair = Math.floor(index / 2);
        pairs[pair] ??= { number: pair + 1 };
        if (move.colour === "w") {
            pairs[pair]!.white = move;
        } else {
            pairs[pair]!.black = move;
        }
    });

    return (
        <Panel title="Moves">
            <div className="moves">
                {pairs.map((pair) => (
                    <div key={pair.number} className="moves-row">
                        <span className="dim">{pair.number}.</span>
                        <span>{pair.white?.san ?? ""}</span>
                        <span>{pair.black?.san ?? ""}</span>
                    </div>
                ))}
                {moves.length === 0 && <p className="dim" style={{ margin: 0 }}>No moves yet.</p>}
            </div>
        </Panel>
    );
}
