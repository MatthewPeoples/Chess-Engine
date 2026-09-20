import { Button } from "./ui/Button.js";
import { BrandMark } from "./BrandMark.js";

export type Tab = "play" | "arena" | "results";

interface Props {
    tab: Tab;
    connected: boolean;
    theme: string;
    onTab: (tab: Tab) => void;
    onHome: () => void;
    onToggleTheme: () => void;
}

const TABS: { id: Tab; label: string }[] = [
    { id: "play", label: "Play" },
    { id: "arena", label: "Arena" },
    { id: "results", label: "Results" },
];

export function AppHeader({ tab, connected, theme, onTab, onHome, onToggleTheme }: Props) {
    return (
        <header className="header">
            <BrandMark onClick={onHome} />

            <nav className="tabs">
                {TABS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`tab ${tab === item.id ? "on" : ""}`}
                        onClick={() => onTab(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="spacer" />

            <span className={`status ${connected ? "" : "off"}`}>
                <span className="status-dot" />
                {connected ? "connected" : "offline"}
            </span>
            <Button variant="ghost" onClick={onToggleTheme}>
                {theme === "dark" ? "Light" : "Dark"}
            </Button>
        </header>
    );
}
