import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
    BuildInfo,
    ClientMessage,
    Colour,
    EngineSnapshot,
    GameState,
    ServerMessage,
    TimeControl,
} from "../../shared/protocol.js";

const SOCKET_URL = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;

export type Seat = { kind: "human" } | { kind: "engine"; engineId: string };

export interface NewGameOptions {
    white: Seat;
    black: Seat;
    timeControl: string;
}

export function useGame() {
    const socket = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [builds, setBuilds] = useState<BuildInfo[]>([]);
    const [timeControls, setTimeControls] = useState<TimeControl[]>([]);
    const [state, setState] = useState<GameState | null>(null);
    const [engine, setEngine] = useState<EngineSnapshot | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const ws = new WebSocket(SOCKET_URL);
        socket.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onmessage = (event) => {
            const message = JSON.parse(String(event.data)) as ServerMessage;

            switch (message.type) {
                case "builds":
                    setBuilds(message.builds);
                    setTimeControls(message.timeControls);
                    break;
                case "state":
                    setState(message.state);
                    if (message.state.status !== "playing" || message.state.paused) {
                        setEngine((current) => (current ? { ...current, thinking: false } : current));
                    }
                    break;
                case "engine":
                    setEngine(message.snapshot);
                    break;
                case "error":
                    setError(message.message);
                    break;
                default:
                    break;
            }
        };

        return () => ws.close();
    }, []);

    const send = useCallback((message: ClientMessage) => {
        if (socket.current?.readyState === WebSocket.OPEN) {
            socket.current.send(JSON.stringify(message));
        }
    }, []);

    const actions = useMemo(
        () => ({
            newGame: (options: NewGameOptions) => {
                setEngine(null);
                setError(null);
                send({ type: "new-game", ...options });
            },
            move: (from: string, to: string, promotion?: string) => send({ type: "move", from, to, promotion }),
            takeback: () => send({ type: "takeback" }),
            forward: () => send({ type: "forward" }),
            resign: () => {
                setError(null);
                send({ type: "resign" });
            },
            setPause: (paused: boolean) => send({ type: "set-pause", paused }),
        }),
        [send],
    );

    return { connected, builds, timeControls, state, engine, error, actions };
}

// The server owns clock state; this interpolates between updates for a smooth display.
export function useTickingClocks(state: GameState | null): Record<Colour, number> {
    const [now, setNow] = useState(Date.now());
    const received = useRef(Date.now());
    const clocks = state?.clocks;

    useEffect(() => {
        received.current = Date.now();
        setNow(Date.now());
    }, [clocks, state?.moves.length, state?.paused]);

    useEffect(() => {
        if (state?.status !== "playing" || state.paused) {
            return;
        }
        const timer = window.setInterval(() => setNow(Date.now()), 100);
        return () => window.clearInterval(timer);
    }, [state?.status, state?.paused]);

    if (!state) {
        return { w: 0, b: 0 };
    }
    if (state.status !== "playing" || state.paused) {
        return state.clocks;
    }

    const elapsed = now - received.current;
    return {
        w: state.turn === "w" ? Math.max(0, state.clocks.w - elapsed) : state.clocks.w,
        b: state.turn === "b" ? Math.max(0, state.clocks.b - elapsed) : state.clocks.b,
    };
}
