#!/usr/bin/env node

import path from "node:path";
import { runWorkerLoop } from "./runLoop.js";
import { PLANNER_ROLE } from "./constants.js";
import type { WorkerRole } from "./types.js";

const VALID_ROLES = ["planner", "executor"] as const;
const ROLE_MAP: Record<(typeof VALID_ROLES)[number], WorkerRole> = {
    planner: PLANNER_ROLE,
    executor: { id: "executor", name: "Executor" },
};

const USAGE = `Usage: backlogmd-workers <backlog-dir> [taskId] [options]

  backlog-dir    Path to .backlogmd directory or project root
  taskId         Optional: run this task once and exit

Options:
  --server-url <url>   Server URL (e.g. http://localhost:3030)
  --name <name>        Worker name (default: dev-<timestamp>)
  --role <role>        Role: ${VALID_ROLES.join(" | ")} (default: planner)
  --interval <secs>   Poll interval in seconds (default: 30)
  --dry               Dry run: run agent but do not write to backlog or VCS (happy-path test)
  --agent <name>      Agent: opencode | emulator (default: opencode). Use emulator + --dry to test worker loop.
  --help               Show this help`;

function parseArgs(argv: string[]): {
    backlogDir: string;
    taskId?: string;
    serverUrl?: string;
    name?: string;
    role?: WorkerRole;
    interval?: number;
    dry?: boolean;
    agent?: "opencode" | "emulator";
} {
    const args = argv.slice(2);
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
        console.log(USAGE);
        process.exit(args.includes("--help") || args.includes("-h") ? 0 : 1);
    }

    const backlogDir = path.resolve(args[0]);
    let taskId: string | undefined;
    let serverUrl: string | undefined;
    let name: string | undefined;
    let role: WorkerRole | undefined;
    let interval: number | undefined;
    let dry = false;
    let agent: "opencode" | "emulator" | undefined;

    for (let i = 1; i < args.length; i++) {
        if (args[i] === "--server-url" && i + 1 < args.length) {
            serverUrl = args[++i];
        } else if (args[i] === "--name" && i + 1 < args.length) {
            name = args[++i];
        } else if (args[i] === "--dry") {
            dry = true;
        } else if (args[i] === "--agent" && i + 1 < args.length) {
            const a = args[++i].toLowerCase();
            if (a === "opencode" || a === "emulator") agent = a;
        } else if (args[i] === "--role" && i + 1 < args.length) {
            const roleArg = args[++i];
            const r = roleArg.toLowerCase();
            if (VALID_ROLES.includes(r as (typeof VALID_ROLES)[number])) {
                role = ROLE_MAP[r as (typeof VALID_ROLES)[number]];
            } else {
                console.error(
                    `Error: invalid role "${roleArg}". Must be one of: ${VALID_ROLES.join(", ")}`,
                );
                console.error(USAGE);
                process.exit(1);
            }
        } else if (args[i] === "--interval" && i + 1 < args.length) {
            interval = parseInt(args[++i], 10) || 30;
        } else if (!args[i].startsWith("--") && !taskId) {
            taskId = args[i];
        }
    }

    return { backlogDir, taskId, serverUrl, name, role, interval, dry, agent };
}

async function main(): Promise<void> {
    const opts = parseArgs(process.argv);
    const pollIntervalMs =
        opts.interval != null && opts.interval > 0 ? opts.interval * 1000 : 30_000;

    await runWorkerLoop({
        backlogDir: opts.backlogDir,
        taskId: opts.taskId,
        serverUrl: opts.serverUrl,
        name: opts.name,
        role: opts.role,
        pollIntervalMs,
        dry: opts.dry,
        agent: opts.agent,
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
