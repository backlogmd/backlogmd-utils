import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

interface Params {
  taskId?: string;
}

/**
 * DELETE /api/tasks/:taskId
 * Removes the task file (and its feedback file if present) from the backlog.
 */
export async function deleteTask(
  ctx: AppContext,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
): Promise<void> {
  const raw = request.params.taskId ?? "";
  const taskId = raw ? decodeURIComponent(raw) : "";

  if (!taskId) {
    await reply.code(400).type("application/json").send({ error: "Missing task id" });
    return;
  }

  try {
    await ctx.backlogmd.removeTask(taskId);
    ctx.notifyClients();
    await reply.code(200).type("application/json").send({ ok: true });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("not found")) {
      await reply.code(404).type("application/json").send({ error: message });
    } else {
      console.error("[backlogmd-serve] deleteTask error:", message);
      await reply.code(500).type("application/json").send({ error: message });
    }
  }
}
