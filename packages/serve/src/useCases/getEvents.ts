import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

export async function getEvents(
  ctx: AppContext,
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const res = reply.raw;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  (res as unknown as { write: (s: string) => void }).write("\n");
  ctx.addEventClient(res);
  // Send initial status (e.g. worker count) on the same SSE stream
  const status = { type: "status" as const, workers: ctx.getWorkerStates().length };
  (res as unknown as { write: (s: string) => void }).write(`data: ${JSON.stringify(status)}\n\n`);
  (_request.raw as unknown as { on: (event: string, fn: () => void) => void }).on("close", () => {
    ctx.removeEventClient(res);
  });
}
