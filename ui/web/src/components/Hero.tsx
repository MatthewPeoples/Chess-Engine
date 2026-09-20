import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { BrandMark } from "./BrandMark.js";
import { TechnicalWall } from "./TechnicalWall.js";
import { Button } from "./ui/Button.js";

interface Props {
    connected: boolean;
    theme: string;
    onToggleTheme: () => void;
    onPlay: () => void;
    onArena: () => void;
}

type HeroPhase = "idle" | "drawing" | "slicing" | "covering";
type Destination = "play" | "arena";

function HeroKing() {
    return (
        <svg className="hero-king" viewBox="0 0 440 700" role="presentation">
            <defs>
                <linearGradient id="king-metal" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="var(--piece-shadow)" />
                    <stop offset="0.14" stopColor="var(--piece-mid)" />
                    <stop offset="0.29" stopColor="var(--piece-highlight)" />
                    <stop offset="0.43" stopColor="var(--piece-mid)" />
                    <stop offset="0.62" stopColor="var(--piece-highlight)" />
                    <stop offset="0.78" stopColor="var(--piece-mid)" />
                    <stop offset="1" stopColor="var(--piece-shadow)" />
                </linearGradient>
                <linearGradient id="king-dark-metal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--piece-mid)" />
                    <stop offset="0.55" stopColor="var(--piece-shadow)" />
                    <stop offset="1" stopColor="var(--bg-deep)" />
                </linearGradient>
                <radialGradient id="king-crown-metal" cx="42%" cy="28%" r="75%">
                    <stop offset="0" stopColor="var(--piece-highlight)" />
                    <stop offset="0.48" stopColor="var(--piece-mid)" />
                    <stop offset="1" stopColor="var(--piece-shadow)" />
                </radialGradient>
                <filter id="king-soft-shadow" x="-30%" y="-20%" width="170%" height="160%">
                    <feDropShadow dx="0" dy="14" stdDeviation="11" floodColor="var(--piece-ground)" />
                </filter>
            </defs>

            <ellipse className="hero-king-ground" cx="220" cy="680" rx="168" ry="17" />

            <g className="hero-king-body" filter="url(#king-soft-shadow)">
                <g className="hero-king-fragment hero-king-crown-left">
                    <path className="hero-king-crown" d="M147 292l-18-119 61 52 30-96v174c-29 1-58-3-73-11z" />
                    <path className="hero-king-crown-inset" d="M152 273c20 7 43 10 68 10V182l-27 81-47-35z" />
                    <path className="hero-king-engrave" d="M166 263l-8-57 45 42 17-56v79" />
                    <path className="hero-king-engrave faint" d="M220 194v77M177 237l12 39" />
                </g>

                <g className="hero-king-fragment hero-king-crown-right">
                    <path className="hero-king-crown" d="M220 129l30 96 61-52-18 119c-15 8-44 12-73 11z" />
                    <path className="hero-king-crown-inset" d="M220 182v101c25 0 48-3 68-10l6-45-47 35z" />
                    <path className="hero-king-engrave" d="M220 192l17 56 45-42-8 57M220 271v-79" />
                    <path className="hero-king-engrave faint" d="M263 237l-12 39" />
                </g>

                <g className="hero-king-fragment hero-king-collar">
                    <path d="M137 294c0-12 37-22 83-22s83 10 83 22v22H137z" />
                    <ellipse cx="220" cy="315" rx="84" ry="17" />
                    <ellipse className="hero-king-ring-light" cx="220" cy="301" rx="75" ry="11" />
                </g>

                <g className="hero-king-fragment hero-king-stem">
                    <path
                        className="hero-king-main"
                        d="M142 318h156c-4 26-21 47-43 59l13 164c24 9 42 25 48 47H124c6-22 24-38 48-47l13-164c-22-12-39-33-43-59z"
                    />
                    <path
                        className="hero-king-stem-shadow"
                        d="M171 540c20-40 27-99 28-164h42c1 65 8 124 28 164-22-7-76-7-98 0z"
                    />
                    <path className="hero-king-highlight" d="M204 381c-2 73-7 126-22 156M218 381c0 75 1 125 4 154" />
                    <path className="hero-king-etched-line faint" d="M151 342c38 12 100 12 138 0" />
                </g>

                <g className="hero-king-fragment hero-king-plinth">
                    <path d="M122 574c-34 17-54 40-54 65h304c0-25-20-48-54-65z" />
                    <ellipse cx="220" cy="585" rx="99" ry="18" />
                    <ellipse className="hero-king-ring-light" cx="220" cy="609" rx="135" ry="17" />
                    <path className="hero-king-etched-line" d="M119 603c58 13 144 13 202 0" />
                </g>

                <g className="hero-king-fragment hero-king-base">
                    <path d="M76 623h288l17 24c0 20-72 36-161 36S59 667 59 647z" />
                    <ellipse className="hero-king-ring-light" cx="220" cy="625" rx="143" ry="21" />
                    <ellipse className="hero-king-base-dark" cx="220" cy="654" rx="153" ry="27" />
                    <ellipse className="hero-king-ring-light" cx="220" cy="647" rx="150" ry="22" />
                    <path className="hero-king-etched-line faint" d="M98 634c70 16 174 16 244 0" />
                    <path className="hero-king-cracks" d="m191 631 11 12-8 12 15 14M257 630l-13 14 9 11-17 15" />
                </g>
            </g>

            <g className="hero-king-sword">
                <path className="hero-sword-blade" d="M208 80h24l-3 129-9 35-9-35z" />
                <path className="hero-sword-fuller" d="M220 87v131" />
                <path className="hero-sword-guard" d="M160 73l17-12h86l17 12-17 12h-86z" />
                <path className="hero-sword-grip" d="M212 18h16v43h-16z" />
                <path className="hero-sword-grip-wrap" d="m213 24 14 8-14 8 14 8-14 8" />
                <circle className="hero-sword-pommel" cx="220" cy="10" r="12" />
            </g>

            <path className="hero-king-specular" d="M147 584c21-21 42-26 48-26M284 577c17 4 29 11 38 22" />
        </svg>
    );
}

function SliceSword() {
    return (
        <svg className="hero-sweep-sword" viewBox="0 0 420 104" role="presentation">
            <defs>
                <linearGradient id="sweep-metal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--piece-highlight)" />
                    <stop offset="0.45" stopColor="var(--piece-mid)" />
                    <stop offset="0.52" stopColor="var(--piece-highlight)" />
                    <stop offset="1" stopColor="var(--piece-shadow)" />
                </linearGradient>
            </defs>
            <path className="hero-sweep-blade" d="M105 38 360 31l47 21-47 21-255-7z" />
            <path className="hero-sweep-fuller" d="m121 50 237-7 25 9-25 9-237-7z" />
            <path className="hero-sweep-guard" d="m94 22 17 8-2 44-18 8-10-21 2-20z" />
            <path className="hero-sweep-grip" d="M22 41h65v22H22z" />
            <path className="hero-sweep-wrap" d="m29 42 13 20 13-20 13 20 13-20" />
            <circle className="hero-sweep-pommel" cx="17" cy="52" r="13" />
        </svg>
    );
}

export function Hero({ connected, theme, onToggleTheme, onPlay, onArena }: Props) {
    const heroRef = useRef<HTMLDivElement>(null);
    const onPlayRef = useRef(onPlay);
    const onArenaRef = useRef(onArena);
    const [phase, setPhase] = useState<HeroPhase>("idle");
    const [destination, setDestination] = useState<Destination | null>(null);
    const transitioning = phase !== "idle";

    useEffect(() => {
        onPlayRef.current = onPlay;
        onArenaRef.current = onArena;
    }, [onArena, onPlay]);

    useEffect(() => {
        if (phase === "idle") {
            return;
        }

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const next = {
            drawing: { delay: 660, run: () => setPhase("slicing" as const) },
            slicing: { delay: reducedMotion ? 80 : 1280, run: () => setPhase("covering" as const) },
            covering: {
                delay: reducedMotion ? 140 : 480,
                run: () => {
                    if (destination === "play") {
                        onPlayRef.current();
                    } else if (destination === "arena") {
                        onArenaRef.current();
                    }
                },
            },
        }[phase];

        const timer = window.setTimeout(next.run, next.delay);
        return () => window.clearTimeout(timer);
    }, [destination, phase]);

    const choose = (next: Destination) => {
        if (transitioning) {
            return;
        }
        setDestination(next);
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setPhase("covering");
            return;
        }
        setPhase("drawing");
    };

    const moveAmbient = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (transitioning || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }
        const hero = heroRef.current;
        if (!hero) {
            return;
        }
        const bounds = hero.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        hero.style.setProperty("--ambient-x", `${x * 2}px`);
        hero.style.setProperty("--ambient-y", `${y * 1.5}px`);
        hero.style.setProperty("--shadow-x", `${x * 9}px`);
        hero.style.setProperty("--shadow-y", `${y * 3}px`);
    };

    const resetAmbient = () => {
        const hero = heroRef.current;
        hero?.style.setProperty("--ambient-x", "0px");
        hero?.style.setProperty("--ambient-y", "0px");
        hero?.style.setProperty("--shadow-x", "0px");
        hero?.style.setProperty("--shadow-y", "0px");
    };

    return (
        <div
            ref={heroRef}
            className={`hero hero-${phase}${destination ? ` hero-to-${destination}` : ""}`}
            onPointerMove={moveAmbient}
            onPointerLeave={resetAmbient}
            aria-busy={transitioning}
        >
            <TechnicalWall />

            <div className="hero-top">
                <BrandMark className="hero-logo" />
                <div className="hero-top-actions">
                    <span className={`status ${connected ? "" : "off"}`}>
                        <span className="status-dot" />
                        {connected ? "server connected" : "server offline"}
                    </span>
                    <Button variant="ghost" onClick={onToggleTheme}>
                        {theme === "dark" ? "Light" : "Dark"}
                    </Button>
                </div>
            </div>

            <main className="hero-layout">
                <div className="hero-intro">
                    <div className="hero-ghost" aria-hidden>
                        <div>C++</div>
                        <div>CHESS ENGINE</div>
                    </div>
                    <div className="hero-byline">
                        <span>Created by Matthew Peoples</span>
                        <div className="hero-profile-links">
                            <a href="https://github.com/MatthewPeoples" target="_blank" rel="noreferrer">
                                GitHub ↗
                            </a>
                            <a href="https://www.linkedin.com/in/matthewjpeoples/" target="_blank" rel="noreferrer">
                                LinkedIn ↗
                            </a>
                        </div>
                    </div>
                </div>

                <div className="hero-king-stage" aria-hidden>
                    <HeroKing />
                </div>

                <div className="hero-body">
                    <div className="hero-choices">
                        <button type="button" className="hero-choice" onClick={() => choose("play")} disabled={transitioning}>
                            <div className="hero-choice-title">PLAY →</div>
                            <div className="hero-choice-sub">One board. You, or engine against engine.</div>
                        </button>
                        <button
                            type="button"
                            className="hero-choice secondary"
                            onClick={() => choose("arena")}
                            disabled={transitioning}
                        >
                            <div className="hero-choice-title">ARENA →</div>
                            <div className="hero-choice-sub">Up to 8 games in parallel. Elo with a margin.</div>
                        </button>
                    </div>
                </div>
            </main>

            <div className="hero-slice-transition" aria-hidden>
                <div className="hero-sword-sweep">
                    <SliceSword />
                </div>
                <div className="hero-slice-mark" />
                <div className="hero-slice-cover" />
            </div>
        </div>
    );
}
