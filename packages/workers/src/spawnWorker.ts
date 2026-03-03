import { spawn } from "child_process";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

export interface SpawnWorkerOptions {
    /** Path to .backlogmd directory. */
    backlogDir: string;
    /** If set, run this task once and exit; otherwise the worker runs in a loop. */
    taskId?: string;
    /** Server URL to report status and logs (e.g. http://localhost:3030). */
    serverUrl?: string;
    /** Worker name (default: dev-<timestamp>). */
    name?: string;
    /** Worker role (e.g. planner, executor). */
    role?: string;
    /** Poll interval in seconds when running in loop (default: 30). */
    interval?: number;
    /** Spawn with stdio inherited so output appears in the parent (default: true). */
    stdio?: "inherit" | "ignore" | "pipe";
    /** If true, the child is detached and will keep running after the parent exits. */
    detached?: boolean;
}

/**
 * Resolve the path to this package's CLI (dist/cli.js next to this file).
 */
function getCliPath(): string {
    return require.resolve("./cli.js");
}

/**
 * Spawn a worker process. Builds argv for the worker CLI and spawns node cli.js with those args.
 * Returns the child process; the caller can await exit, ignore, or listen to events.
 */
export function spawnWorker(options: SpawnWorkerOptions): ReturnType<typeof spawn> {
    const {
        backlogDir,
        taskId,
        serverUrl,
        name,
        role,
        interval,
        stdio = "inherit",
        detached = false,
    } = options;

    const cliPath = getCliPath();
    const argv: string[] = [cliPath, path.resolve(backlogDir)];
    if (taskId) argv.push(taskId);
    if (serverUrl) argv.push("--server-url", serverUrl);
    if (name) argv.push("--name", name);
    if (role) argv.push("--role", role);
    if (interval != null && interval > 0) argv.push("--interval", String(interval));

    const child = spawn(process.execPath, argv, {
        stdio,
        detached,
        cwd: path.dirname(path.dirname(backlogDir)),
        env: process.env,
    });

    if (detached) {
        child.unref();
    }

    return child;
}
