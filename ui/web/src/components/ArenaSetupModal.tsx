import { useMemo, useState } from "react";

import { ARENA_TIME_CONTROLS, type ArenaSetup, type BuildInfo } from "../../../shared/protocol.js";
import { Button } from "./ui/Button.js";
import { Dropdown } from "./ui/Dropdown.js";
import { Modal } from "./ui/Modal.js";
import { Segmented } from "./ui/Segmented.js";

interface Props {
    builds: BuildInfo[];
    onClose: () => void;
    onStart: (setup: ArenaSetup) => void;
}

const GAME_COUNTS = [100, 200, 600, 1000];

// Rough, but it updates as the settings change, which is the point
function estimate(games: number, parallel: number, timeControl: string): string {
    const control = ARENA_TIME_CONTROLS.find((entry) => entry.name === timeControl);
    if (!control) {
        return "—";
    }

    const perGameMs = 2 * (control.baseMs + control.incrementMs * 60);
    const totalMinutes = (games * perGameMs) / parallel / 60_000;

    if (totalMinutes < 90) {
        return `≈ ${Math.max(1, Math.round(totalMinutes))} minutes`;
    }
    return `≈ ${(totalMinutes / 60).toFixed(1)} hours`;
}

export function ArenaSetupModal({ builds, onClose, onStart }: Props) {
    const [mainId, setMainId] = useState(builds[0]?.id ?? "");
    const [opponentId, setOpponentId] = useState(builds[1]?.id ?? builds[0]?.id ?? "");
    const [games, setGames] = useState(200);
    const [parallel, setParallel] = useState(2);
    const [timeControl, setTimeControl] = useState("10+0.1");

    const options = builds.map((build) => ({ id: build.id, label: build.label }));
    const time = useMemo(() => estimate(games, parallel, timeControl), [games, parallel, timeControl]);
    const mainLabel = builds.find((build) => build.id === mainId)?.label ?? "the main version";

    return (
        <Modal
            title="New arena run"
            wide
            onClose={onClose}
            footer={
                <>
                    <span className="estimate">
                        <span className="label">Estimated</span>
                        <span className="estimate-value tabular">{time}</span>
                    </span>
                    <div className="spacer" />
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onStart({ mainId, opponentId, games, parallel, timeControl })}
                        disabled={builds.length === 0}
                    >
                        Start run
                    </Button>
                </>
            }
        >
            <div className="two-up">
                <div className="field">
                    <span className="label accent">New version</span>
                    <Dropdown value={mainId} options={options} onChange={setMainId} />
                </div>
                <div className="field">
                    <span className="label">Opponent</span>
                    <Dropdown value={opponentId} options={options} onChange={setOpponentId} />
                </div>
            </div>
            <p className="dim setup-note">Every number in the run is reported for {mainLabel}.</p>

            <div className="field">
                <div className="field-head">
                    <span className="label">Games in parallel</span>
                    <span className="tabular">{parallel}</span>
                </div>
                <Segmented
                    value={parallel}
                    onChange={setParallel}
                    tight
                    options={[2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: n, label: String(n) }))}
                />
            </div>

            <div className="two-up">
                <div className="field">
                    <span className="label">Total games</span>
                    <Segmented
                        value={games}
                        onChange={setGames}
                        tight
                        options={GAME_COUNTS.map((n) => ({ value: n, label: String(n) }))}
                    />
                </div>
                <div className="field">
                    <span className="label">Time control</span>
                    <Segmented
                        value={timeControl}
                        onChange={setTimeControl}
                        options={ARENA_TIME_CONTROLS.map((control) => ({ value: control.name, label: control.name }))}
                    />
                </div>
            </div>

            <div className="note">
                <strong>Startup can take 2–4 minutes at 8 games in parallel, depending on your computer.</strong>
                <span>Openings are drawn at random from a 500-position book.</span>
                <span>Each opening is played twice, with the colours swapped.</span>
                <span>Every game is played: the verdict updates live, and Stop keeps the score as it stands.</span>
            </div>
        </Modal>
    );
}
