import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

interface Params {
  encodedSource?: string;
}

/**
 * GET /api/tasks/:encodedSource/content
 * Returns the full file content of the task (METADATA + DESCRIPTION + ACCEPTANCE CRITERIA).
 */
export async function getTaskContent(
  ctx: AppContext,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
): Promise<void> {
  const taskSource = request.params.encodedSource
    ? decodeURIComponent(request.params.encodedSource)
    : "";

  if (!taskSource) {
    await reply.code(400).type("application/json").send({ error: "Missing task source" });
    return;
  }

  try {
    const { content } = await ctx.backlogmd.getTaskFileContent(taskSource);
    await reply.type("application/json").send({ content });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("not found")) {
      await reply.code(404).type("application/json").send({ error: message });
    } else {
      console.error("[backlogmd-serve] getTaskContent error:", message);
      await reply.code(500).type("application/json").send({ error: message });
    }
  }
}
