import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

interface Params {
  encodedSource?: string;
}

interface Body {
  content?: string;
}

/**
 * PUT /api/tasks/:encodedSource/content
 * Overwrites the task file (full content). Reloads tree and notifies clients.
 */
export async function putTaskContent(
  ctx: AppContext,
  request: FastifyRequest<{ Params: Params; Body: Body }>,
  reply: FastifyReply,
): Promise<void> {
  const taskSource = request.params.encodedSource
    ? decodeURIComponent(request.params.encodedSource)
    : "";

  if (!taskSource) {
    await reply.code(400).type("application/json").send({ error: "Missing task source" });
    return;
  }

  const body = request.body as Body | undefined;
  const content = typeof body?.content === "string" ? body.content : "";

  try {
    await ctx.backlogmd.updateTaskFileContent(taskSource, content);
    ctx.notifyClients();
    ctx.triggerWorkAvailable();
    await reply.type("application/json").send({ ok: true });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("not found")) {
      await reply.code(404).type("application/json").send({ error: message });
    } else {
      console.error("[backlogmd-serve] putTaskContent error:", message);
      await reply.code(500).type("application/json").send({ error: message });
    }
  }
}
