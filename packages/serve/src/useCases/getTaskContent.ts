import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

/**
 * GET /api/tasks/:taskId/content
 * taskId is URL-encoded so path stays one segment (e.g. work%2F002-item%2F001-task.md).
 * Returns the full file content of the task (METADATA + DESCRIPTION + ACCEPTANCE CRITERIA).
 */
export async function getTaskContent(
  ctx: AppContext,
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const raw = request.params.taskId ?? "";
  const taskId = raw ? decodeURIComponent(raw) : "";

  if (!taskId) {
    await reply.code(400).type("application/json").send({ error: "Missing task id" });
    return;
  }

  try {
    const { content } = await ctx.backlogmd.getTaskFileContent(taskId);
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
