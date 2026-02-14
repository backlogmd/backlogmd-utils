#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs";
import { startServer } from "./index.js";

export interface CliArgs {
  dir: string;
  port: number;
  host: string;
  help: boolean;
}

const USAGE = `Usage: backlogmd-serve [options]

Options:
  --dir <path>    Path to .backlogmd/ directory (default: .backlogmd/)
  --port <port>   Port to listen on (default: 3030)
  --host <host>   Host to bind to (default: localhost)
  --help          Show this help message`;

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dir: path.join(process.cwd(), ".backlogmd"),
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
        args.dir = path.resolve(argv[++i]);
        break;
      case "--port": {
        if (i + 1 >= argv.length) {
          throw new Error("--port requires a port argument");
        }
        const port = parseInt(argv[++i], 10);
        if (isNaN(port) || port <= 0 || port > 65535) {
          throw new Error("--port must be a valid port number (1-65535)");
        }
        args.port = port;
        break;
      }
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

  if (!fs.existsSync(args.dir)) {
    console.error(`Error: directory not found: ${args.dir}`);
    return 1;
  }

  const server = startServer({
    dir: args.dir,
    port: args.port,
    host: args.host,
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

const exitCode = run(process.argv.slice(2));
if (exitCode !== 0) {
  process.exit(exitCode);
}
