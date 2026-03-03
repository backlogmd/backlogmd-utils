import path from "path";
import { watchBacklogDir } from "./watcher.js";
import { createServer } from "./server.js";

export { createServer } from "./server.js";
export type { ServerResult } from "./server.js";

export interface ServerOptions {
    dir?: string;
    port?: number;
    host?: string;
    /** Backlogmd instance (source of truth). Must be loaded before startServer. */
    backlogmd: import("@backlogmd/core").Backlogmd;
    /** Called when the server is listening; receives ctx (e.g. to start in-process workers with getWorkTrigger). */
    onListening?: (ctx: import("./context.js").AppContext) => void;
}

export interface ServerHandle {
    close: () => void;
}

export function startServer(options: ServerOptions): ServerHandle {
    const cwd = process.cwd();
    const dir = path.resolve(options.dir || path.join(cwd, ".backlogmd"));
    const port = options.port || 3000;
    const { backlogmd } = options;
    const {
        notifyClients,
        close: closeServer,
        triggerWorkAvailable,
    } = createServer(port, dir, {
        backlogmd,
        onListening: options.onListening,
    });

    const watcher = watchBacklogDir(dir, () => {
        void backlogmd.reconcile().then(() => {
            notifyClients();
            triggerWorkAvailable();
        });
    });

    const close = () => {
        watcher.close();
        closeServer();
    };

    return { close };
}
