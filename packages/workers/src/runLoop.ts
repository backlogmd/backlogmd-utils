import path from "path";
import fs from "node:fs";
import { BacklogCore } from "@backlogmd/core";
import { Worker } from "./workerRunner.js";
import { WorkerReporter } from "./reporter.js";
import { BacklogHttpClient } from "./backlogmdClient.js";
import { OpenCodeAgent } from "./agents/opencode.js";
import { AgentEmulator } from "./agents/agentEmulator.js";
import { GitProvider } from "@backlogmd/vcs";
import type { WorkerRole } from "./types.js";
import { PLANNER_ROLE, EXECUTOR_ROLE } from "./constants.js";

const DEFAULT_POLL_INTERVAL_MS = 30_000;

function resolveRole(role: WorkerRole | undefined): WorkerRole {
    if (!role) return PLANNER_ROLE;
    if (role.id === "executor") return { ...EXECUTOR_ROLE, name: role.name ?? EXECUTOR_ROLE.name };
    if (role.id === "planner") return { ...PLANNER_ROLE, name: role.name ?? PLANNER_ROLE.name };
    return role;
}

/** Resolve to the directory that contains work/ (same as serve: prefer .backlogmd). */
function resolveBacklogRoot(dir: string): string {
    const resolved = path.resolve(dir);
    const dotBacklogmd = path.join(resolved, ".backlogmd");
    const workAtRoot = path.join(resolved, "work");
    if (fs.existsSync(dotBacklogmd)) return dotBacklogmd;
    if (fs.existsSync(workAtRoot)) return resolved;
    return resolved;
}

export interface WorkerLoopOptions {
    /** Path to .backlogmd directory (or project root). */
    backlogDir: string;
    serverUrl?: string;
    name?: string;
    role?: WorkerRole;
    pollIntervalMs?: number;
    /** If set, run this task once and exit. */
    taskId?: string;
    /** When set, wait on this promise instead of polling (event-driven). */
    getWorkTrigger?: () => Promise<void>;
    autoCommit?: boolean;
    autoPush?: boolean;
    /** Dry run: run agent but do not write to backlog or VCS (for happy-path testing). */
    dry?: boolean;
    /** Use agent emulator (setTimeout + success) instead of OpenCode; good with --dry for happy-path tests. */
    agent?: "opencode" | "emulator";
}

const DEFAULT_ROLES: WorkerRole[] = [PLANNER_ROLE, EXECUTOR_ROLE];

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) =>
        (globalThis as unknown as { setTimeout(fn: () => void, d: number): unknown }).setTimeout(
            resolve,
            ms,
        ),
    );
}

/**
 * Run the worker loop in the current process (for in-process use with the server).
 * Never returns when taskId is not set; runs until process exits.
 */
export async function runWorkerLoop(opts: WorkerLoopOptions): Promise<void> {
    const backlogRoot = resolveBacklogRoot(opts.backlogDir);
    const name = opts.name ?? `dev-${Date.now()}`;
    const role = resolveRole(opts.role ?? DEFAULT_ROLES[0]);
    const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

    console.log(`[worker:${name}] Loading backlog from: ${backlogRoot}`);
    console.log(`[worker:${name}] Role: ${role.id}`);
    if (opts.dry) {
        console.log(`[worker:${name}] Dry run: no backlog or VCS writes`);
    }

    const core = await BacklogCore.load({ rootDir: backlogRoot });

    let reporter: WorkerReporter | undefined;
    let serverClient: BacklogHttpClient | undefined;
    if (opts.serverUrl) {
        reporter = new WorkerReporter(opts.serverUrl, {
            name,
            role: role.id,
        });
        serverClient = new BacklogHttpClient(opts.serverUrl);
    }

    const useEmulator = opts.agent === "emulator";
    const agent = useEmulator
        ? new AgentEmulator(path.dirname(backlogRoot), role, { delayMs: 2000 })
        : new OpenCodeAgent(undefined, path.dirname(backlogRoot), role, reporter);
    if (useEmulator) {
        console.log(`[worker:${name}] Agent: emulator (simulated work, 2s per task)`);
    }

    const gitRoot = backlogRoot.endsWith(".backlogmd") ? path.dirname(backlogRoot) : backlogRoot;
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
        opts.dry,
    );

    if (opts.taskId) {
        console.log(`[worker:${name}] One-shot: executing task ${opts.taskId}`);
        await worker.runTaskById(opts.taskId);
        return;
    }

    const getTrigger = opts.getWorkTrigger;
    console.log(
        `[worker:${name}] Loop mode: ${getTrigger ? "event-driven (server queue)" : `polling every ${pollIntervalMs / 1000}s`}`,
    );
    while (true) {
        reporter?.reportStatus({ status: "idle" });
        if (getTrigger) {
            await getTrigger();
        }
        let didAssignedWork = false;
        if (serverClient) {
            try {
                const { statusCode, assignments: list } = await serverClient.getAssignments(name);
                if (statusCode === 200) {
                    if (list.length === 0) {
                        console.log(`[worker:${name}] Available work: none`);
                    } else {
                        console.log(`[worker:${name}] Available work: ${list.length} item(s)`);
                        const assignment = list[0];
                        try {
                            const taskTitle = assignment.taskId
                                ? core
                                      .getState()
                                      .tasks.find(
                                          (t) =>
                                              t.source === assignment.taskId ||
                                              t.slug === assignment.taskId ||
                                              `${t.itemSlug}/${t.priority}` === assignment.taskId,
                                      )?.name
                                : undefined;
                            await reporter?.reportStatusAndWait({
                                status: "in-progress",
                                taskId: assignment.taskId,
                                itemId: assignment.itemId,
                                taskTitle:
                                    taskTitle ??
                                    (assignment.itemId
                                        ? `Item ${assignment.itemId}`
                                        : undefined),
                            });
                            if (assignment.taskId) {
                                await worker.runTaskById(assignment.taskId);
                                didAssignedWork = true;
                            } else if (assignment.itemId) {
                                const tasksForItem = core
                                    .getState()
                                    .tasks.filter((t) => t.itemSlug === assignment.itemId);
                                if (tasksForItem.length === 0 && role.id === "planner") {
                                    await worker.runPlanningForItem(assignment.itemId);
                                } else {
                                    await worker.runItemById(assignment.itemId);
                                }
                                didAssignedWork = true;
                            }
                        } finally {
                            reporter?.reportStatus({ status: "idle" });
                        }
                    }
                }
            } catch (err) {
                console.error(
                    `[worker:${name}] Failed to fetch available work:`,
                    (err as Error).message,
                );
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
