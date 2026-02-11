import {
  createServer as createHttpServer,
  type Server,
  type ServerResponse,
  type IncomingMessage,
} from "node:http";
import { renderHtml } from "./html.js";
import { buildBacklogOutput } from "@backlogmd/parser";

export interface ServerResult {
  server: Server;
  notifyClients: () => void;
  close: () => void;
}

export function createServer(port: number, backlogDir: string): ServerResult {
  const clients = new Set<ServerResponse>();

  const requestHandler = (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const output = buildBacklogOutput(backlogDir);
      const html = renderHtml(output);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }

    if (url.pathname === "/api/backlog" || url.pathname === "/api/backlog.json") {
      const output = buildBacklogOutput(backlogDir);
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
