#!/usr/bin/env node
/// <reference types="node" />

import path from "path";
import type { WorkerRole } from "./types.js";
import { PLANNER_ROLE } from "./types.js";
import { runWorkerLoop } from "./runLoop.js";

const AVAILABLE_ROLES: WorkerRole[] = [
  PLANNER_ROLE,
  { id: "executor", name: "Executor" },
];
const DEFAULT_POLL_INTERVAL_MS = 30_000;

function parseArgs(args: string[]): {
  backlogDir: string;
  taskId?: string;
  autoCommit: boolean;
  autoPush: boolean;
  serverUrl?: string;
  name?: string;
  role?: WorkerRole;
  pollIntervalMs: number;
} {
  let backlogDir = "";
  let taskId: string | undefined;
  let autoCommit = false;
  let autoPush = false;
  let serverUrl: string | undefined;
  let name: string | undefined;
  let role: WorkerRole | undefined;
  let pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--auto-commit") autoCommit = true;
    else if (arg === "--auto-push") autoPush = true;
    else if (arg === "--server-url" && args[i + 1]) {
      serverUrl = args[++i];
    } else if (arg === "--name" && args[i + 1]) {
      name = args[++i];
    } else if (arg === "--role" && args[i + 1]) {
      const roleId = args[++i];
      role =
        roleId === "planner"
          ? PLANNER_ROLE
          : AVAILABLE_ROLES.find((r) => r.id === roleId) ?? { id: roleId, name: roleId };
    } else if (arg === "--interval" && args[i + 1]) {
      const sec = Number(args[++i]);
      pollIntervalMs = Number.isFinite(sec) && sec > 0 ? sec * 1000 : DEFAULT_POLL_INTERVAL_MS;
    } else if (!arg.startsWith("--")) {
      if (!backlogDir) backlogDir = arg;
      else if (!taskId) taskId = arg;
    }
  }

  return { backlogDir, taskId, autoCommit, autoPush, serverUrl, name, role, pollIntervalMs };
}

async function main() {
  const args = process.argv.slice(2);
  const opts = parseArgs(args);

  if (!opts.backlogDir) {
    console.error("Usage: worker <backlog-dir> [task-id] [options]");
    console.error("  backlog-dir: Path to .backlogmd/ directory");
    console.error("  Runs in a loop: polls for plan tasks, executes them, reports status to the server (use --server-url).");
    console.error("  task-id: Optional. If given, run that task once and exit (no loop).");
    console.error("  --server-url <url>: Report status and logs to this backlogmd-serve URL");
    console.error("  --name <name>: Worker name (default: dev-<timestamp>)");
    console.error("  --role <id>: Worker role (default: first of planner, executor)");
    console.error("  --interval <sec>: Seconds to wait between polls (default: 30)");
    console.error("  --auto-commit: Automatically commit changes after task completion");
    console.error("  --auto-push: Automatically push after commit");
    process.exit(1);
  }

  await runWorkerLoop({
    backlogDir: path.resolve(opts.backlogDir),
    taskId: opts.taskId,
    serverUrl: opts.serverUrl,
    name: opts.name,
    role: opts.role,
    autoCommit: opts.autoCommit,
    autoPush: opts.autoPush,
    pollIntervalMs: opts.pollIntervalMs,
  });
}

main().catch((err) => {
  console.error("[worker] Error:", err);
  process.exit(1);
});
