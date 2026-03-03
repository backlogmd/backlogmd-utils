import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

export interface AssignWorkBody {
  workerId?: string;
  taskId?: string;
  itemId?: string;
}

export async function postAssignWork(
  ctx: AppContext,
  request: FastifyRequest<{ Body: AssignWorkBody }>,
  reply: FastifyReply,
): Promise<void> {
  const body = request.body ?? {};
  const workerId = typeof body.workerId === "string" ? body.workerId.trim() : "";
  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : undefined;
  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : undefined;

  if (!workerId) {
    await reply.code(400).type("application/json").send({
      error: "Missing workerId",
    });
    return;
  }
  if (!taskId && !itemId) {
    await reply.code(400).type("application/json").send({
      error: "Provide at least one of taskId or itemId",
    });
    return;
  }

  try {
    if (taskId) {
      await ctx.backlogmd.assignAgent(taskId, workerId);
      if (process.env.BACKLOGMD_DEBUG_ASSIGNMENTS === "1") {
        console.log(`[assign] task assignee written workerId=${workerId} taskId=${taskId} backlogDir=${ctx.backlogDir}`);
      }
    }
    if (itemId) {
      await ctx.backlogmd.assignItem(itemId, workerId);
      if (process.env.BACKLOGMD_DEBUG_ASSIGNMENTS === "1") {
        console.log(`[assign] item assignee written workerId=${workerId} itemId=${itemId} backlogDir=${ctx.backlogDir}`);
      }
    }
  } catch (err) {
    const message = (err as Error).message;
    await reply.code(404).type("application/json").send({
      error: message,
    });
    return;
  }

  ctx.enqueueAssignment({
    workerId,
    taskId,
    itemId,
  });
  ctx.notifyClients();
  ctx.triggerWorkAvailable();

  await reply.code(200).type("application/json").send({ ok: true });
}
