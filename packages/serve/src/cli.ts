#!/usr/bin/env node

import "dotenv/config";
import path from "path";
import fs from "node:fs";
import { fileURLToPath } from "url";
import { runWorkerLoop, PLANNER_ROLE } from "@backlogmd/workers";
import type { AppContext } from "./context.js";
import { startServer } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;

export interface CliArgs {
  /** Project root directory (must contain .backlogmd/) */
  rootDir: string;
  port: number;
  host: string;
  help: boolean;
}

const USAGE = `Usage: backlogmd-serve [options]

Options:
  --dir <path>    Project root: must contain .backlogmd/ (with work/ inside) or a work/ directory (default: current directory)
  --port <port>   Port to listen on (default: 3030)
  --host <host>   Host to bind to (default: localhost)
  --help          Show this help message`;

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    rootDir: process.cwd(),
    port: 3030,
    host: "localhost",
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--dir":
        if (i + 1 >= argv.length) {
          throw new Error("--dir requires a path argument");
        }
        args.rootDir = path.resolve(argv[++i]);
        break;
      case "--port":
        if (i + 1 >= argv.length) {
          throw new Error("--port requires a port argument");
        }
        const port = parseInt(argv[++i], 10);
        if (isNaN(port) || port <= 0 || port > 65535) {
          throw new Error("--port must be a valid port number (1-65535)");
        }
        args.port = port;
        break;
      case "--host":
        if (i + 1 >= argv.length) {
          throw new Error("--host requires a host argument");
        }
        args.host = argv[++i];
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }

  return args;
}

const STAFF_ROLE = { id: "executor", name: "Executor" } as const;

/** Start planner and staff in-process; they wait on the server queue (no poll loop). */
function startAgentsInProcess(backlogRoot: string, host: string, port: number, ctx: AppContext): void {
  const url = `http://${host}:${port}`;
  void runWorkerLoop({
    backlogDir: backlogRoot,
    serverUrl: url,
    name: "Planner",
    role: PLANNER_ROLE,
    getWorkTrigger: ctx.getWorkTrigger,
  });
  void runWorkerLoop({
    backlogDir: backlogRoot,
    serverUrl: url,
    name: "Staff",
    role: STAFF_ROLE,
    getWorkTrigger: ctx.getWorkTrigger,
  });
  console.error("[serve] Started 2 agents in-process (event-driven, no poll loop)");
}

export function run(argv: string[]): number {
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error((e as Error).message);
    console.error(USAGE);
    return 1;
  }

  if (args.help) {
    console.log(USAGE);
    return 0;
  }

  if (!fs.existsSync(args.rootDir)) {
    console.error(`Error: project root not found: ${args.rootDir}`);
    return 1;
  }

  // Resolve backlog root: directory that contains work/
  // Prefer .backlogmd (project/.backlogmd/work/); fallback to project root (project/work/)
  // If neither exists, create .backlogmd/work/ and use it
  const dotBacklogmd = path.join(args.rootDir, ".backlogmd");
  const workAtRoot = path.join(args.rootDir, "work");
  let backlogRoot: string;
  if (fs.existsSync(dotBacklogmd)) {
    backlogRoot = dotBacklogmd;
  } else if (fs.existsSync(workAtRoot)) {
    backlogRoot = args.rootDir;
  } else {
    fs.mkdirSync(path.join(dotBacklogmd, "work"), { recursive: true });
    backlogRoot = dotBacklogmd;
    console.error(`Created ${path.join(args.rootDir, ".backlogmd", "work")} (empty backlog).`);
  }

  const server = startServer({
    dir: backlogRoot,
    port: args.port,
    host: args.host,
    onListening: (ctx) => {
      startAgentsInProcess(backlogRoot, args.host, args.port, ctx);
    },
  });

  const url = `http://${args.host}:${args.port}`;
  console.error(`BacklogMD board running at ${url}`);
  console.error("Press Ctrl+C to stop");

  const handleShutdown = () => {
    console.error("\nShutting down...");
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);

  return 0;
}

if (isMain) {
  const exitCode = run(process.argv.slice(2));
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
