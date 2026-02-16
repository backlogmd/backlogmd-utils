import type { Server } from "node:http";
import type { ServerResponse } from "node:http";
import Fastify from "fastify";
import { createChatAgentForServer } from "./chatAgent.js";
import type { AppContext } from "./context.js";
import { registerRoutes } from "./routes.js";

export interface ServerResult {
  server: Server;
  notifyClients: () => void;
  close: () => void;
}

export function createServer(port: number, backlogDir: string): ServerResult {
  const clients = new Set<ServerResponse>();

  let chatAgentPromise: Promise<Awaited<ReturnType<typeof createChatAgentForServer>>> | null = null;
  const getChatAgent = (): Promise<Awaited<ReturnType<typeof createChatAgentForServer>>> => {
    if (!chatAgentPromise) {
      chatAgentPromise = createChatAgentForServer(backlogDir, {
        onBacklogChange: () => notifyClients(),
      });
    }
    return chatAgentPromise;
  };

  if (process.env.OPENAI_API_KEY) {
    void getChatAgent();
  }

  const notifyClients = (): void => {
    const message = "data: reload\n\n";
    for (const client of clients) {
      try {
        client.write(message);
      } catch {
        // Client may have closed
      }
    }
  };

  const ctx: AppContext = {
    backlogDir,
    getChatAgent,
    notifyClients,
    addEventClient: (res) => clients.add(res),
    removeEventClient: (res) => clients.delete(res),
  };

  const fastify = Fastify({ logger: false });

  registerRoutes(fastify, ctx);

  fastify.setNotFoundHandler((_request, reply) => {
    reply.code(404).type("text/plain").send("Not Found");
  });

  const close = (): void => {
    for (const client of clients) {
      try {
        client.end();
      } catch {
        // ignore
      }
    }
    clients.clear();
    void fastify.close();
  };

  fastify.listen({ port, host: "localhost" }, (err) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  });

  return {
    server: fastify.server,
    notifyClients,
    close,
  };
}
