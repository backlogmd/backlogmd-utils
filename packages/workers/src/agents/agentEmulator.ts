import type { CodeAgent, AgentTask, AgentResult, WorkerRole } from "../types.js";

const DEFAULT_DELAY_MS = 2000;

export interface AgentEmulatorOptions {
    /** Simulated work duration in ms before resolving (default: 2000). */
    delayMs?: number;
}

/**
 * Agent that emulates a real worker: waits a configurable time then resolves
 * each task as successful. Use with --dry to test the happy path of the worker
 * loop (take task → wait → solve) without external services or file writes.
 */
export class AgentEmulator implements CodeAgent {
    name = "agent-emulator";
    private workDir?: string;
    private role?: WorkerRole;
    private delayMs: number;

    constructor(
        workDir?: string,
        role?: WorkerRole,
        options?: AgentEmulatorOptions,
    ) {
        this.workDir = workDir;
        this.role = role;
        this.delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
    }

    async execute(task: AgentTask): Promise<AgentResult> {
        const delayMs = this.delayMs;
        console.log(
            `[agent-emulator] Working on task: ${task.title} (simulated, ${delayMs}ms)...`,
        );
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`[agent-emulator] Solved: ${task.title}`);
                resolve({
                    taskId: task.id,
                    success: true,
                    output: `[emulator] Completed "${task.title}" after ${delayMs}ms`,
                    error: undefined,
                    json: undefined,
                });
            }, delayMs);
        });
    }
}
