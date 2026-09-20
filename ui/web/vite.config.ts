import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Permit imports from the shared wire types outside web/.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        fs: { allow: [".."] },
        proxy: {
            "/ws": { target: "ws://localhost:8787", ws: true },
        },
    },
    build: { outDir: "dist" },
});
