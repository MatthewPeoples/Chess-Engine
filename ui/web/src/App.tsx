import { useState } from "react";

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
    const { connected, builds, timeControls, state, engine, error, actions } = useGame();
    const clocks = useTickingClocks(state);
    const [theme, toggleTheme] = useTheme();
    const [route, setRoute] = useState<Route>("hero");
    const [setupOpen, setSetupOpen] = useState(false);

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
                    <div className="empty">
                        <strong>Arena is next</strong>
                        Hundreds of games in parallel, live Elo with a confidence margin, and a verdict on whether the
                        new version is a real improvement.
                        <br />
                        The match runner lands in the next build.
                    </div>
                )}

                {route === "results" && (
                    <div className="empty">
                        <strong>No runs yet</strong>
                        The Elo chart and the run history appear here after the first arena finishes.
                    </div>
                )}
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
        </div>
    );
}
