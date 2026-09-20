import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { WebSocketServer } from "ws";

import type { BuildInfo, ClientMessage, ServerMessage } from "../../shared/protocol.js";
import { ARENA_TIME_CONTROLS, TIME_CONTROLS } from "../../shared/protocol.js";
import { findBuild, listBuilds } from "./builds.js";
import { Arena } from "./arena.js";
import { openingBook } from "./book.js";
import { Game } from "./game.js";
import { loadRuns } from "./runs.js";

const PORT = Number(process.env.PORT ?? 8787);
const WEB_DIST = path.resolve(import.meta.dirname, "../../web/dist");

const CONTENT_TYPES: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".json": "application/json",
};

const server = http.createServer((request, response) => {
    const url = (request.url ?? "/").split("?")[0];
    const file = path.join(WEB_DIST, url === "/" ? "index.html" : url);

    if (!fs.existsSync(WEB_DIST)) {
        response.writeHead(404).end("run npm run dev, or npm run build first");
        return;
    }
    const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(WEB_DIST, "index.html");
    response.writeHead(200, { "content-type": CONTENT_TYPES[path.extname(target)] ?? "text/plain" });
    fs.createReadStream(target).pipe(response);
});

const sockets = new WebSocketServer({ server, path: "/ws" });

function seatFor(seat: { kind: "human" } | { kind: "engine"; engineId: string }) {
    if (seat.kind === "human") {
        return { kind: "human" as const };
    }
    const build = findBuild(seat.engineId);
    return build ? { kind: "engine" as const, build } : undefined;
}

sockets.on("connection", (socket) => {
    const send = (message: ServerMessage) => {
        if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    };

    const game = new Game(send);
    const arena = new Arena(send);
    send({ type: "builds", builds: listBuilds(), timeControls: TIME_CONTROLS });
    send({ type: "state", state: game.state() });
    send({ type: "arena", state: arena.state() });
    send({ type: "runs", runs: loadRuns() });

    socket.on("message", (raw) => {
        let message: ClientMessage;
        try {
            message = JSON.parse(String(raw)) as ClientMessage;
        } catch {
            return;
        }

        void handle(message);
    });

    socket.on("close", () => {
        game.dispose();
        arena.dispose();
    });

    async function handle(message: ClientMessage): Promise<void> {
        switch (message.type) {
            case "hello":
                send({ type: "builds", builds: listBuilds(), timeControls: TIME_CONTROLS });
                break;

            case "new-game": {
                const timeControl = TIME_CONTROLS.find((control) => control.name === message.timeControl);
                if (!timeControl) {
                    send({ type: "error", message: "unknown time control" });
                    return;
                }

                const builds: Partial<Record<"w" | "b", BuildInfo>> = {};
                for (const [colour, setup] of [
                    ["w", message.white],
                    ["b", message.black],
                ] as const) {
                    if (setup.kind !== "engine") {
                        continue;
                    }
                    const build = findBuild(setup.engineId ?? "");
                    if (!build) {
                        send({ type: "error", message: `unknown engine ${setup.engineId}` });
                        return;
                    }
                    builds[colour] = build;
                }

                try {
                    await game.start({ builds, timeControl });
                } catch (error) {
                    send({ type: "error", message: `could not start the engine: ${String(error)}` });
                }
                break;
            }

            case "move":
                await game.humanMove(message.from, message.to, message.promotion);
                break;

            case "takeback":
                game.takeback();
                break;

            case "forward":
                game.forward();
                break;

            case "start-arena": {
                const setup = message.setup;
                const main = findBuild(setup.mainId);
                const opponent = findBuild(setup.opponentId);
                const timeControl = ARENA_TIME_CONTROLS.find((control) => control.name === setup.timeControl);

                if (!main || !opponent || !timeControl) {
                    send({ type: "error", message: "unknown version or time control" });
                    return;
                }

                // the book is generated once and cached, so this is instant after the first run
                void arena.start(setup, main, opponent, timeControl, openingBook()).catch((error: unknown) => {
                    send({ type: "error", message: `arena stopped: ${String(error)}` });
                });
                break;
            }

            case "stop-arena":
                arena.stop();
                break;

            case "list-runs":
                send({ type: "runs", runs: loadRuns() });
                break;

            case "resign":
                game.resign();
                break;

            case "set-pause":
                game.setPause(message.paused);
                break;

            default:
                break;
        }
    }
});

server.listen(PORT, () => {
    const builds = listBuilds();
    console.log(`ui server on http://localhost:${PORT}`);
    console.log(builds.length > 0 ? `builds: ${builds.map((b) => b.label).join(", ")}` : "no builds found - build the engine first");
});
