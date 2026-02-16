#!/usr/bin/env node

import path from "node:path";
import { BacklogCore } from "@backlogmd/core";
import { Worker } from "./workerRunner.js";
import { OpenCodeAgent } from "./agents/opencode.js";
import { GitProvider } from "@backlogmd/vcs";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: worker <backlog-dir> [task-id] [options]");
    console.error("  backlog-dir: Path to .backlogmd/ directory");
    console.error("  task-id: Optional. Execute a specific task by ID instead of all plan tasks");
    console.error("  --auto-commit: Automatically commit changes after task completion");
    console.error("  --auto-push: Automatically push after commit");
    process.exit(1);
  }

  const rootDir = path.resolve(args[0]);
  const taskId = args[1];

  let autoCommit = false;
  let autoPush = false;

  for (const arg of args) {
    if (arg === "--auto-commit") autoCommit = true;
    if (arg === "--auto-push") autoPush = true;
  }

  console.log(`[worker] Loading backlog from: ${rootDir}`);

  const core = await BacklogCore.load({ rootDir, autoReconcile: false });
  const agent = new OpenCodeAgent();

  let vcs;
  if (autoCommit || autoPush) {
    vcs = new GitProvider(rootDir);
  }

  const worker = new Worker(core, agent, vcs, {
    autoCommit,
    autoPush,
    commitMessageTemplate: "feat: {task}",
  });

  if (taskId && !taskId.startsWith("--")) {
    console.log(`[worker] Executing task: ${taskId}`);
    await worker.runTaskById(taskId);
  } else {
    console.log("[worker] Running all plan tasks");
    await worker.run();
  }
}

main().catch((err) => {
  console.error("[worker] Error:", err);
  process.exit(1);
});
