import { useState } from "react";

import type { BuildInfo, TimeControl } from "../../../shared/protocol.js";
import type { NewGameOptions, Seat } from "../useGame.js";
import { Button } from "./ui/Button.js";
import { Dropdown } from "./ui/Dropdown.js";
import { Modal } from "./ui/Modal.js";
import { Segmented } from "./ui/Segmented.js";

interface Props {
    builds: BuildInfo[];
    timeControls: TimeControl[];
    onClose: () => void;
    onStart: (options: NewGameOptions) => void;
}

type Mode = "human" | "engines";
type Side = "w" | "b" | "random";

export function PlaySetupModal({ builds, timeControls, onClose, onStart }: Props) {
    const newest = builds[0]?.id ?? "";
    const [mode, setMode] = useState<Mode>("human");
    const [side, setSide] = useState<Side>("w");
    const [whiteId, setWhiteId] = useState(newest);
    const [blackId, setBlackId] = useState(builds[1]?.id ?? newest);
    const [timeControl, setTimeControl] = useState("3+0");

    const options = builds.map((build) => ({ id: build.id, label: build.label }));

    const start = () => {
        const mine: "w" | "b" = side === "random" ? (Math.random() < 0.5 ? "w" : "b") : side;
        const engine = (id: string): Seat => ({ kind: "engine", engineId: id });

        onStart({
            white: mode === "engines" ? engine(whiteId) : mine === "w" ? { kind: "human" } : engine(blackId),
            black: mode === "engines" ? engine(blackId) : mine === "b" ? { kind: "human" } : engine(whiteId),
            timeControl,
        });
    };

    return (
        <Modal
            title="New game"
            onClose={onClose}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={start} disabled={builds.length === 0}>
                        Start
                    </Button>
                </>
            }
        >
            <div className="field">
                <span className="label">Mode</span>
                <Segmented
                    value={mode}
                    onChange={(value) => {
                        setMode(value);
                        setTimeControl(value === "engines" ? "3+2" : "3+0");
                    }}
                    options={[
                        { value: "human", label: "You vs engine" },
                        { value: "engines", label: "Engine vs engine" },
                    ]}
                />
            </div>

            {mode === "engines" ? (
                <div className="two-up">
                    <div className="field">
                        <span className="label">White</span>
                        <Dropdown value={whiteId} options={options} onChange={setWhiteId} />
                    </div>
                    <div className="field">
                        <span className="label">Black</span>
                        <Dropdown value={blackId} options={options} onChange={setBlackId} />
                    </div>
                </div>
            ) : (
                <div className="two-up">
                    <div className="field">
                        <span className="label">Opponent</span>
                        <Dropdown value={whiteId} options={options} onChange={setWhiteId} />
                    </div>
                    <div className="field">
                        <span className="label">You play</span>
                        <Segmented
                            value={side}
                            onChange={setSide}
                            options={[
                                { value: "w", label: "White" },
                                { value: "b", label: "Black" },
                                { value: "random", label: "Random" },
                            ]}
                        />
                    </div>
                </div>
            )}

            <div className="field">
                <span className="label">Time control</span>
                <Segmented
                    value={timeControl}
                    onChange={setTimeControl}
                    options={timeControls.map((control) => ({ value: control.name, label: control.name }))}
                />
            </div>

            {builds.length === 0 && (
                <p className="dim" style={{ margin: 0, fontSize: 11 }}>
                    No engine versions found. Build one first.
                </p>
            )}
        </Modal>
    );
}
