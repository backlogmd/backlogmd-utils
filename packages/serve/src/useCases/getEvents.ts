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
  res.write("\n");
  ctx.addEventClient(res);
  _request.raw.on("close", () => {
    ctx.removeEventClient(res);
  });
}
