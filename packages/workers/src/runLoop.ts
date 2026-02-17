import path from "path";
import fs from "node:fs";
import http from "node:http";
import { BacklogCore } from "@backlogmd/core";
import { Worker } from "./workerRunner.js";
import { WorkerReporter } from "./reporter.js";
import { OpenCodeAgent } from "./agents/opencode.js";
import { GitProvider } from "@backlogmd/vcs";
import type { WorkerRole } from "./types.js";
import { PLANNER_ROLE } from "./types.js";

const DEFAULT_POLL_INTERVAL_MS = 30_000;

export interface WorkerLoopOptions {
  backlogDir: string;
  taskId?: string;
  serverUrl?: string;
  name?: string;
  role?: WorkerRole;
  autoCommit?: boolean;
  autoPush?: boolean;
  pollIntervalMs?: number;
  /** When provided (e.g. in-process with server), wait for this instead of polling on an interval. */
  getWorkTrigger?: () => Promise<void>;
}

const DEFAULT_ROLES: WorkerRole[] = [
  PLANNER_ROLE,
  { id: "executor", name: "Executor" },
];

function sleep(ms: number): Promise<void> {
  return new Promise(
    (resolve) => (globalThis as unknown as { setTimeout(fn: () => void, d: number): unknown }).setTimeout(resolve, ms),
  );
}

function sanitizeForBranch(s: string): string {
  return s.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").slice(0, 64);
}

/**
 * Run the worker loop in the current process (for in-process use with the server).
 * Never returns when taskId is not set; runs until process exits.
 */
export async function runWorkerLoop(opts: WorkerLoopOptions): Promise<void> {
  const rootDir = path.resolve(opts.backlogDir);
  const name = opts.name ?? `dev-${Date.now()}`;
  const role = opts.role ?? DEFAULT_ROLES[0];
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  console.log(`[worker:${name}] Loading backlog from: ${rootDir}`);
  console.log(`[worker:${name}] Role: ${role.id}`);

  const core = await BacklogCore.load({ rootDir });

  let reporter: WorkerReporter | undefined;
  if (opts.serverUrl) {
    reporter = new WorkerReporter(opts.serverUrl, {
      name,
      role: role.id,
    });
  }

  const agent = new OpenCodeAgent(undefined, path.dirname(rootDir), role, reporter);

  const gitRoot = rootDir.endsWith(".backlogmd") ? path.dirname(rootDir) : rootDir;
  let vcs: GitProvider | undefined;
  if (opts.serverUrl || opts.autoCommit || opts.autoPush) {
    vcs = new GitProvider(gitRoot);
  }

  const worker = new Worker(
    core,
    agent,
    vcs,
    {
      autoCommit: opts.autoCommit ?? false,
      autoPush: opts.autoPush ?? false,
      commitMessageTemplate: "feat: {task}",
    },
    reporter,
    role,
  );

  if (opts.taskId) {
    console.log(`[worker:${name}] One-shot: executing task ${opts.taskId}`);
    await worker.runTaskById(opts.taskId);
    return;
  }

  const getTrigger = opts.getWorkTrigger;
  console.log(`[worker:${name}] Loop mode: ${getTrigger ? "event-driven (server queue)" : `polling every ${pollIntervalMs / 1000}s`}`);
  while (true) {
    reporter?.reportStatus({ status: "idle" });
    if (getTrigger) {
      await getTrigger();
    }
    let didAssignedWork = false;
    if (opts.serverUrl) {
      try {
        const url = new URL("/api/workers/assignments", opts.serverUrl);
        url.searchParams.set("name", name);
        const { statusCode, body } = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
          const req = http.get(url.toString(), (res) => {
            let data = "";
            const stream = res as unknown as { on(ev: string, fn: (chunk: Buffer | string) => void): void };
            stream.on("data", (chunk) => (data += chunk.toString()));
            stream.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body: data }));
          });
          req.on("error", reject);
        });
        if (statusCode === 200) {
          const json = JSON.parse(body) as { assignments?: Array<{ taskId?: string; itemId?: string }> };
          const list = json.assignments ?? [];
          if (list.length === 0) {
            console.log(`[worker:${name}] Available work: none`);
          } else {
            console.log(`[worker:${name}] Available work: ${list.length} item(s)`);
            const assignment = list[0];
            const slug = assignment.taskId ?? assignment.itemId ?? "work";
            const workerId = `${name}:${role.id}`;
            const branch = `assign/${sanitizeForBranch(workerId)}/${sanitizeForBranch(slug)}`;
            let coreToUse: BacklogCore | null = core;
            let workerToUse = worker;
            const isPlanningInMain =
              assignment.itemId != null &&
              assignment.taskId == null &&
              role.id === "planner" &&
              core.getState().tasks.filter((t) => t.itemSlug === assignment.itemId).length === 0;
            if (!isPlanningInMain && vcs) {
              const worktrees = await vcs.listWorktrees();
              const wt = worktrees.find((w) => w.branch === branch);
              if (wt) {
                const backlogInWorktree = path.join(wt.path, ".backlogmd");
                if (fs.existsSync(backlogInWorktree)) {
                  console.log(`[worker:${name}] Using worktree: ${wt.path}`);
                  coreToUse = await BacklogCore.load({ rootDir: backlogInWorktree });
                  const vcsWorktree = new GitProvider(wt.path);
                  workerToUse = new Worker(
                    coreToUse,
                    agent,
                    vcsWorktree,
                    {
                      autoCommit: opts.autoCommit ?? false,
                      autoPush: opts.autoPush ?? false,
                      commitMessageTemplate: "feat: {task}",
                    },
                    reporter,
                    role,
                  );
                }
              }
              if (workerToUse === worker) {
                const checkoutResult = await vcs.checkout(branch);
                if (checkoutResult.success) {
                  console.log(`[worker:${name}] Switched to branch: ${branch}`);
                  core.refresh();
                  coreToUse = core;
                } else {
                  console.error(`[worker:${name}] Checkout failed: ${checkoutResult.error}`);
                  coreToUse = null;
                }
              }
            } else if (isPlanningInMain) {
              console.log(`[worker:${name}] Planning in main (no branch switch)`);
            }
            try {
              if (coreToUse && workerToUse) {
                const taskTitle = assignment.taskId
                  ? coreToUse.getState().tasks.find((t) => t.source === assignment.taskId || t.slug === assignment.taskId)?.name
                  : undefined;
                await reporter?.reportStatusAndWait({
                  status: "in-progress",
                  taskId: assignment.taskId,
                  itemId: assignment.itemId,
                  taskTitle: taskTitle ?? (assignment.itemId ? `Item ${assignment.itemId}` : undefined),
                });
                if (assignment.taskId) {
                  await workerToUse.runTaskById(assignment.taskId);
                  didAssignedWork = true;
                } else if (assignment.itemId) {
                  const tasksForItem = coreToUse.getState().tasks.filter(
                    (t) => t.itemSlug === assignment.itemId,
                  );
                  if (tasksForItem.length === 0 && role.id === "planner") {
                    await workerToUse.runPlanningForItem(assignment.itemId);
                  } else {
                    await workerToUse.runWorkById(assignment.itemId);
                  }
                  didAssignedWork = true;
                }
              }
            } finally {
              // Always clear server-side claim so planner can get more work next round (even if we threw or hung and never reported idle from workerRunner).
              reporter?.reportStatus({ status: "idle" });
            }
          }
        }
      } catch (err) {
        console.error(`[worker:${name}] Failed to fetch available work:`, (err as Error).message);
      }
    }
    if (!didAssignedWork) {
      await worker.run();
    }
    reporter?.reportStatus({ status: "idle" });
    if (!getTrigger) {
      await sleep(pollIntervalMs);
    }
  }
}
