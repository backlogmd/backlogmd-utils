import type { FastifyInstance } from "fastify";
import type { AppContext } from "./context.js";
import { getIndexPage } from "./useCases/getIndexPage.js";
import { getBacklog } from "./useCases/getBacklog.js";
import { patchTaskStatus } from "./useCases/patchTaskStatus.js";
import { postChat } from "./useCases/postChat.js";
import { getEvents } from "./useCases/getEvents.js";

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

  app.post<{ Body: { messages?: Array<{ role?: string; content?: string }> } }>(
    "/api/chat",
    (req, reply) => postChat(ctx, req as never, reply),
  );

  app.get("/events", (req, reply) => getEvents(ctx, req, reply));
}
