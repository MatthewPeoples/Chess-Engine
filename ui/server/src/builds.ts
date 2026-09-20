import fs from "node:fs";
import path from "node:path";

import type { BuildInfo } from "../../shared/protocol.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
const BINARY = process.platform === "win32" ? "chess_uci.exe" : "chess_uci";

function isRunnable(file: string): boolean {
    try {
        fs.accessSync(file, fs.constants.X_OK);
        return fs.statSync(file).isFile();
    } catch {
        return false;
    }
}

export function listBuilds(): BuildInfo[] {
    const builds: BuildInfo[] = [];

    const working = path.join(REPO_ROOT, "build-release", "bin", BINARY);
    if (isRunnable(working)) {
        builds.push({ id: "working", label: "working build", path: working });
    }

    const buildsDir = path.join(REPO_ROOT, "builds");
    if (fs.existsSync(buildsDir)) {
        for (const entry of fs.readdirSync(buildsDir).sort().reverse()) {
            const candidate = path.join(buildsDir, entry, BINARY);
            if (isRunnable(candidate)) {
                builds.push({ id: entry, label: entry, path: candidate });
            }
        }
    }

    return builds;
}

export function findBuild(id: string): BuildInfo | undefined {
    return listBuilds().find((build) => build.id === id);
}
