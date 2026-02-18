import type { FastifyInstance } from "fastify";
import type { AppContext, WorkerReportBody } from "./context.js";
import { getIndexPage } from "./useCases/getIndexPage.js";
import { getBacklog } from "./useCases/getBacklog.js";
import { patchTaskStatus } from "./useCases/patchTaskStatus.js";
import { deleteTask } from "./useCases/deleteTask.js";
import { deleteItem } from "./useCases/deleteItem.js";
import { postChat } from "./useCases/postChat.js";
import { getEvents } from "./useCases/getEvents.js";
import { postWorkerReport } from "./useCases/postWorkerReport.js";
import { getWorkers } from "./useCases/getWorkers.js";
import { postAssignWork, type AssignWorkBody } from "./useCases/postAssignWork.js";
import { getWorkerAssignments } from "./useCases/getWorkerAssignments.js";

export function registerRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/", (req, reply) => getIndexPage(ctx, req, reply));
  app.get("/index.html", (req, reply) => getIndexPage(ctx, req, reply));

  app.get("/api/backlog", (req, reply) => getBacklog(ctx, req, reply));
  app.get("/api/backlog.json", (req, reply) => getBacklog(ctx, req, reply));

  app.patch<{
    Params: { encodedSource: string };
    Body: { status?: string };
  }>("/api/tasks/:encodedSource", (req, reply) =>
    patchTaskStatus(ctx, req as never, reply),
  );
  app.delete<{ Params: { encodedSource: string } }>(
    "/api/tasks/:encodedSource",
    (req, reply) => deleteTask(ctx, req as never, reply),
  );

  app.delete<{ Params: { encodedSlug: string } }>(
    "/api/items/:encodedSlug",
    (req, reply) => deleteItem(ctx, req as never, reply),
  );

  app.post<{ Body: { messages?: Array<{ role?: string; content?: string }> } }>(
    "/api/chat",
    (req, reply) => postChat(ctx, req as never, reply),
  );

  app.get("/events", (req, reply) => getEvents(ctx, req, reply));

  app.get("/api/workers", (req, reply) => getWorkers(ctx, req, reply));
  app.post<{ Body: WorkerReportBody }>(
    "/api/workers/report",
    (req, reply) => postWorkerReport(ctx, req as never, reply),
  );
  app.post<{ Body: AssignWorkBody }>(
    "/api/workers/assign",
    (req, reply) => postAssignWork(ctx, req as never, reply),
  );

  app.get<{ Querystring: { name?: string; role?: string } }>(
    "/api/work",
    (req, reply) => getWorkerAssignments(ctx, req as never, reply),
  );

  app.get<{ Querystring: { name?: string; role?: string } }>(
    "/api/workers/assignments",
    (req, reply) => getWorkerAssignments(ctx, req as never, reply),
  );
}
