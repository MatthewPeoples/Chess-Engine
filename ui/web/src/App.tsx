import { useState } from "react";

import { ArenaSetupModal } from "./components/ArenaSetupModal.js";
import { ArenaView } from "./components/ArenaView.js";
import { ResultsView } from "./components/ResultsView.js";
import { AnalysisPanel } from "./components/AnalysisPanel.js";
import { AppHeader, type Tab } from "./components/AppHeader.js";
import { BoardPanel } from "./components/BoardPanel.js";
import { Hero } from "./components/Hero.js";
import { MoveList } from "./components/MoveList.js";
import { PlaySetupModal } from "./components/PlaySetupModal.js";
import { SearchPanel } from "./components/SearchPanel.js";
import { useTheme } from "./lib/theme.js";
import { useGame, useTickingClocks } from "./useGame.js";

type Route = "hero" | Tab;

export default function App() {
    const { connected, builds, timeControls, state, engine, arena, runs, error, actions } = useGame();
    const clocks = useTickingClocks(state);
    const [theme, toggleTheme] = useTheme();
    const [route, setRoute] = useState<Route>("hero");
    const [setupOpen, setSetupOpen] = useState(false);
    const [arenaSetupOpen, setArenaSetupOpen] = useState(false);

    if (route === "hero") {
        return (
            <Hero
                connected={connected}
                theme={theme}
                onToggleTheme={toggleTheme}
                onPlay={() => setRoute("play")}
                onArena={() => setRoute("arena")}
            />
        );
    }

    return (
        <div className="shell">
            <AppHeader
                tab={route}
                connected={connected}
                theme={theme}
                onTab={setRoute}
                onHome={() => setRoute("hero")}
                onToggleTheme={toggleTheme}
            />

            <div className="content">
                {error && <p className="error">{error}</p>}

                {route === "play" && (
                    <>
                        {connected && builds.length === 0 && (
                            <div className="empty" style={{ marginBottom: 16 }}>
                                <strong>No engine versions found</strong>
                                Build the working tree, or a tagged release:
                                <br />
                                <code>cmake --preset release &amp;&amp; cmake --build build-release</code>
                                <br />
                                <code>./scripts/build-version.sh v1.0</code>
                            </div>
                        )}

                        <main className="play">
                            <BoardPanel
                                state={state}
                                engine={engine}
                                clocks={clocks}
                                onMove={actions.move}
                                onNewGame={() => setSetupOpen(true)}
                                onBack={actions.takeback}
                                onForward={actions.forward}
                                onResign={actions.resign}
                                onSetPause={actions.setPause}
                            />

                            <aside className="play-sidebar">
                                <SearchPanel snapshot={engine} state={state} />
                                <AnalysisPanel snapshot={engine} state={state} />
                                <MoveList moves={state?.moves ?? []} />
                            </aside>
                        </main>
                    </>
                )}

                {route === "arena" && (
                    <ArenaView
                        arena={arena}
                        builds={builds}
                        onOpenSetup={() => setArenaSetupOpen(true)}
                        onStop={actions.stopArena}
                    />
                )}

                {route === "results" && <ResultsView runs={runs} />}
            </div>

            {setupOpen && (
                <PlaySetupModal
                    builds={builds}
                    timeControls={timeControls}
                    onClose={() => setSetupOpen(false)}
                    onStart={(options) => {
                        actions.newGame(options);
                        setSetupOpen(false);
                        setRoute("play");
                    }}
                />
            )}
            {arenaSetupOpen && (
                <ArenaSetupModal
                    builds={builds}
                    onClose={() => setArenaSetupOpen(false)}
                    onStart={(setup) => {
                        actions.startArena(setup);
                        setArenaSetupOpen(false);
                        setRoute("arena");
                    }}
                />
            )}
        </div>
    );
}
