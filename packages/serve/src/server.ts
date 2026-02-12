import {
  createServer as createHttpServer,
  type Server,
  type ServerResponse,
  type IncomingMessage,
} from "node:http";
import { renderHtml } from "./html.js";
import { buildBacklogOutput } from "@backlogmd/parser";
import type { BacklogOutput } from "@backlogmd/types";

export interface ServerResult {
  server: Server;
  notifyClients: () => void;
  close: () => void;
}

/**
 * Build an empty BacklogOutput with a single error entry.
 * Used as a fallback when the parser fails catastrophically.
 */
function errorOutput(backlogDir: string, err: Error): BacklogOutput {
  return {
    protocol: "backlogmd/v2",
    generatedAt: new Date().toISOString(),
    rootDir: backlogDir,
    entries: [],
    items: [],
    tasks: [],
    validation: {
      errors: [
        {
          code: "FATAL_PARSE_ERROR",
          message: `Failed to read backlog: ${err.message}`,
          source: "",
        },
      ],
      warnings: [],
    },
  };
}

export function createServer(port: number, backlogDir: string): ServerResult {
  const clients = new Set<ServerResponse>();

  const requestHandler = (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      let output: BacklogOutput;
      try {
        output = buildBacklogOutput(backlogDir);
      } catch (err) {
        console.error("[backlogmd-serve] Parse error:", (err as Error).message);
        output = errorOutput(backlogDir, err as Error);
      }

      if (output.validation.errors.length > 0) {
        for (const e of output.validation.errors) {
          console.error(`[backlogmd-serve] ${e.code}: ${e.message}${e.source ? ` (${e.source})` : ""}`);
        }
      }

      const html = renderHtml(output);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }

    if (url.pathname === "/api/backlog" || url.pathname === "/api/backlog.json") {
      let output: BacklogOutput;
      try {
        output = buildBacklogOutput(backlogDir);
      } catch (err) {
        console.error("[backlogmd-serve] Parse error:", (err as Error).message);
        output = errorOutput(backlogDir, err as Error);
      }

      if (output.validation.errors.length > 0) {
        for (const e of output.validation.errors) {
          console.error(`[backlogmd-serve] ${e.code}: ${e.message}${e.source ? ` (${e.source})` : ""}`);
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(output));
      return;
    }

    if (url.pathname === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("\n");
      clients.add(res);
      req.on("close", () => {
        clients.delete(res);
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  };

  const server = createHttpServer(requestHandler);

  const notifyClients = () => {
    const message = "data: reload\n\n";
    for (const client of clients) {
      client.write(message);
    }
  };

  const close = () => {
    for (const client of clients) {
      client.end();
    }
    clients.clear();
    server.close();
  };

  server.listen(port);

  return { server, notifyClients, close };
}
