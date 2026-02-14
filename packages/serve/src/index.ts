import path from "node:path";
import { watchBacklogDir } from "./watcher.js";
import { createServer, type ServerResult } from "./server.js";

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
  let dir = path.resolve(options.dir || path.join(cwd, ".backlogmd"));
  if (!dir.endsWith(".backlogmd")) {
    dir = path.join(dir, ".backlogmd");
  }
  const port = options.port || 3000;

  const serverResult = createServer(port, dir);

  const watcher = watchBacklogDir(dir, async () => {
    try {
      await serverResult.notifyClients();
    } catch (err) {
      console.error("[watcher] Error reloading core:", err);
    }
  });

  const close = () => {
    watcher.close();
    serverResult.close();
  };

  return { close };
}
