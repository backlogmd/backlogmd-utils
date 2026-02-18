import type { Server, ServerResponse } from "http";
import Fastify from "fastify";
//import { createChatAgentForServer } from "./chatAgent.js";
import type { AppContext, WorkerReportBody } from "./context.js";
import { WorkerRegistry } from "./workerRegistry.js";
import { AssignmentQueue } from "./assignmentQueue.js";
import { registerRoutes } from "./routes.js";

export interface ServerResult {
  server: Server;
  notifyClients: () => void;
  close: () => void;
  /** Signal in-process workers to check for work (e.g. for watcher). */
  triggerWorkAvailable: () => void;
}

export interface CreateServerOptions {
  /** Called when the server is listening; receives ctx so workers can register for work triggers. */
  onListening?: (ctx: AppContext) => void;
}

export function createServer(
  port: number,
  backlogDir: string,
  options: CreateServerOptions = {},
): ServerResult {
  const { onListening } = options;
  const clients = new Set<ServerResponse>();

  const broadcastWorkerUpdate = (payload: WorkerReportBody): void => {
    const message = `data: ${JSON.stringify({ type: "worker", payload })}\n\n`;
    for (const client of clients) {
      try {
        (client as unknown as { write: (s: string) => void }).write(message);
      } catch {
        // Client may have closed
      }
    }
  };

  const workerRegistry = new WorkerRegistry(broadcastWorkerUpdate);

  const broadcastStatus = (): void => {
    const count = workerRegistry.getAll().length;
    const message = `data: ${JSON.stringify({ type: "status", workers: count })}\n\n`;
    for (const client of clients) {
      try {
        (client as unknown as { write: (s: string) => void }).write(message);
      } catch {
        // Client may have closed
      }
    }
  };

  // let chatAgentPromise: Promise<Awaited<ReturnType<typeof createChatAgentForServer>>> | null = null;
  // const getChatAgent = (): Promise<Awaited<ReturnType<typeof createChatAgentForServer>>> => {
  //   if (!chatAgentPromise) {
  //     chatAgentPromise = createChatAgentForServer(backlogDir, {
  //       onBacklogChange: () => notifyClients(),
  //       getWorkerStates: () => workerRegistry.getAll(),
  //     });
  //   }
  //   return chatAgentPromise;
  // };

  // if (process.env.OPENAI_API_KEY) {
  //   void getChatAgent();
  // }

  const notifyClients = (): void => {
    const message = "data: reload\n\n";
    for (const client of clients) {
      try {
        (client as unknown as { write: (s: string) => void }).write(message);
      } catch {
        // Client may have closed
      }
    }
  };

  const reportWorker = (body: WorkerReportBody) => workerRegistry.report(body);
  const getWorkerStates = () => workerRegistry.getAll();

  const assignmentQueue = new AssignmentQueue();
  const enqueueAssignment = (msg: import("./assignmentQueue.js").AssignmentMessage) =>
    assignmentQueue.enqueue(msg);
  const dequeueAssignment = (workerId: string) => assignmentQueue.dequeueForWorker(workerId);
  const listAssignments = (workerId: string) => assignmentQueue.listForWorker(workerId);

  const CLAIM_STALE_MS = 5 * 60 * 1000; // 5 minutes
  const claimedByWorker = new Map<string, { itemId: string; since: number }>();
  const setClaimedItem = (workerKey: string, itemId: string | null): void => {
    if (itemId) claimedByWorker.set(workerKey, { itemId, since: Date.now() });
    else claimedByWorker.delete(workerKey);
  };
  const isItemClaimed = (itemId: string): boolean => {
    const now = Date.now();
    for (const entry of claimedByWorker.values()) {
      if (entry.itemId === itemId) {
        if (now - entry.since > CLAIM_STALE_MS) {
          const toDelete = [...claimedByWorker.entries()]
            .filter(([, v]) => v.itemId === itemId)
            .map(([k]) => k);
          for (const k of toDelete) claimedByWorker.delete(k);
          return false;
        }
        return true;
      }
    }
    return false;
  };

  const workTriggerResolvers: Array<() => void> = [];
  const getWorkTrigger = (): Promise<void> =>
    new Promise((resolve) => {
      workTriggerResolvers.push(resolve);
    });
  const triggerWorkAvailable = (): void => {
    for (const r of workTriggerResolvers) r();
    workTriggerResolvers.length = 0;
  };

  const ctx: AppContext = {
    backlogDir,
    getChatAgent: () => Promise.resolve(null),
    notifyClients,
    broadcastWorkerUpdate,
    broadcastStatus,
    reportWorker,
    getWorkerStates,
    enqueueAssignment,
    dequeueAssignment,
    listAssignments,
    addEventClient: (res) => clients.add(res),
    removeEventClient: (res) => clients.delete(res),
    setClaimedItem,
    isItemClaimed,
    getWorkTrigger,
    triggerWorkAvailable,
  };

  const fastify = Fastify({ logger: false });

  registerRoutes(fastify, ctx);

  fastify.setNotFoundHandler((_request, reply) => {
    reply.code(404).type("text/plain").send("Not Found");
  });

  const close = (): void => {
    for (const client of clients) {
      try {
        (client as unknown as { end: () => void }).end();
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
    onListening?.(ctx);
    triggerWorkAvailable();
    setTimeout(() => triggerWorkAvailable(), 1500);
  });

  return {
    server: fastify.server,
    notifyClients,
    close,
    triggerWorkAvailable,
  };
}
