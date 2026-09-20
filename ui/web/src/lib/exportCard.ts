// The Results tab as a PNG for the README. Built as SVG and painted onto a canvas, so there is
// no dependency and it is a pure function of the run data

import type { RunSummary } from "../../../shared/protocol.js";
import { cumulativeElo } from "./elo.js";

const WIDTH = 1200;
const HEIGHT = 630;

function escape(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function palette() {
    const style = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;

    return {
        bg: token("--bg-deep", "#081410"),
        panel: token("--panel", "#0f201a"),
        line: token("--line", "#1e3a2e"),
        text: token("--text", "#e6efe8"),
        dim: token("--dim", "#7f9a8c"),
        good: token("--good", "#6fbf95"),
        bad: token("--bad", "#e0705c"),
    };
}

function chart(runs: RunSummary[], colours: ReturnType<typeof palette>): string {
    const points = cumulativeElo(runs);
    if (points.length === 0) {
        return "";
    }

    const left = 700;
    const width = 460;
    const top = 150;
    const height = 380;
    const values = points.map((point) => point.elo);
    const low = Math.min(0, ...values) - 20;
    const high = Math.max(20, ...values) + 20;

    const x = (index: number) => left + (index * width) / Math.max(points.length - 1, 1);
    const y = (value: number) => top + height - ((value - low) / (high - low)) * height;

    const line = points.map((point, index) => `${x(index)},${y(point.elo)}`).join(" ");
    const dots = points
        .map(
            (point, index) =>
                `<circle cx="${x(index)}" cy="${y(point.elo)}" r="5" fill="${colours.good}"/>` +
                `<text x="${x(index)}" y="${top + height + 26}" fill="${colours.dim}" font-size="15" text-anchor="middle">${escape(point.version)}</text>`,
        )
        .join("");

    return `<polyline points="${line}" fill="none" stroke="${colours.good}" stroke-width="3"/>${dots}`;
}

export function exportResultsCard(runs: RunSummary[]): void {
    const colours = palette();
    const latest = runs[runs.length - 1];
    const positive = (latest?.elo ?? 0) >= 0;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
        <rect width="${WIDTH}" height="${HEIGHT}" fill="${colours.bg}"/>
        <rect x="660" y="100" width="500" height="470" rx="12" fill="${colours.panel}" stroke="${colours.line}"/>
        <text x="48" y="92" fill="${colours.dim}" font-family="JetBrains Mono, monospace" font-size="18" letter-spacing="4">CHESS ENGINE · C++20</text>
        <text x="48" y="190" fill="${colours.text}" font-family="JetBrains Mono, monospace" font-size="60" font-weight="700">${escape(latest?.main ?? "—")} <tspan fill="${colours.dim}">vs</tspan> ${escape(latest?.opponent ?? "—")}</text>

        <text x="48" y="270" fill="${colours.dim}" font-family="JetBrains Mono, monospace" font-size="17" letter-spacing="3">ELO</text>
        <text x="48" y="330" fill="${positive ? colours.good : colours.bad}" font-family="JetBrains Mono, monospace" font-size="52" font-weight="700">${positive ? "+" : "−"}${Math.abs(latest?.elo ?? 0).toFixed(0)}</text>
        <text x="48" y="360" fill="${colours.dim}" font-family="JetBrains Mono, monospace" font-size="18">± ${(latest?.error ?? 0).toFixed(0)}</text>

        <text x="300" y="270" fill="${colours.dim}" font-family="JetBrains Mono, monospace" font-size="17" letter-spacing="3">SCORE</text>
        <text x="300" y="330" fill="${colours.text}" font-family="JetBrains Mono, monospace" font-size="52" font-weight="700">${score(latest)}</text>
        <text x="300" y="360" fill="${colours.dim}" font-family="JetBrains Mono, monospace" font-size="18">${latest?.wins ?? 0} / ${latest?.draws ?? 0} / ${latest?.losses ?? 0}</text>

        <rect x="48" y="470" width="230" height="46" rx="23" fill="none" stroke="${latest?.verdict === "accepted" ? colours.good : colours.bad}"/>
        <text x="72" y="500" fill="${latest?.verdict === "accepted" ? colours.good : colours.bad}" font-family="JetBrains Mono, monospace" font-size="19" letter-spacing="3">${escape((latest?.verdict ?? "—").toUpperCase())}</text>
        <text x="48" y="556" fill="${colours.dim}" font-family="JetBrains Mono, monospace" font-size="18">${latest?.games ?? 0} games · ${escape(latest?.timeControl ?? "")} · LLR ${(latest?.llr ?? 0).toFixed(2)}</text>

        <text x="700" y="140" fill="${colours.dim}" font-family="JetBrains Mono, monospace" font-size="17" letter-spacing="3">ELO ACROSS VERSIONS</text>
        ${chart(runs, colours)}
    </svg>`;

    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = WIDTH * 2; // 2x, so it stays sharp in a readme
        canvas.height = HEIGHT * 2;

        const context = canvas.getContext("2d");
        if (!context) {
            return;
        }
        context.scale(2, 2);
        context.drawImage(image, 0, 0);

        const link = document.createElement("a");
        link.download = `chess-engine-${latest?.main ?? "results"}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function score(run: RunSummary | undefined): string {
    if (!run || run.games === 0) {
        return "—";
    }
    return `${(((run.wins + run.draws / 2) / run.games) * 100).toFixed(1)}%`;
}
