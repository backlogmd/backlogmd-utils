import path from "node:path";
import { watchBacklogDir } from "./watcher.js";
import { createServer } from "./server.js";

export { createServer } from "./server.js";
export type { ServerResult } from "./server.js";

export interface ServerOptions {
  dir?: string;
  port?: number;
  host?: string;
}

export interface ServerHandle {
  close: () => void;
}

export function startServer(options: ServerOptions = {}): ServerHandle {
  const cwd = process.cwd();
  const dir = path.resolve(options.dir || path.join(cwd, ".backlogmd"));
  const port = options.port || 3000;
  const host = options.host || "localhost";

  const { server, notifyClients, close: closeServer } = createServer(port, dir);

  const watcher = watchBacklogDir(dir, () => {
    notifyClients();
  });

  const close = () => {
    watcher.close();
    closeServer();
  };

  return { close };
}
