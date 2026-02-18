import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext, WorkerReportBody } from "../context.js";

/**
 * When a worker reports "in-progress", update the backlog so the task/item
 * is marked in-progress and removed from the assignments list.
 * @returns true if a task was updated (item has tasks); false if item has no tasks (caller should claim item).
 */
async function updateBacklogInProgress(ctx: AppContext, body: WorkerReportBody): Promise<boolean> {
  if (body.status !== "in-progress") return false;
  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : undefined;
  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : undefined;
  if (!taskId && !itemId) return false;

  try {
    const doc = ctx.backlogmd.getDocument();
    let taskSource: string | undefined;
    if (taskId) {
      for (const item of doc.work) {
        const task = item.tasks.find(
          (t) => t.source === taskId || t.slug === taskId,
        );
        if (task) {
          taskSource = task.source ?? `${task.itemSlug}/${task.slug}`;
          break;
        }
      }
    } else if (itemId) {
      for (const item of doc.work) {
        if (item.slug !== itemId && !item.slug.startsWith(itemId + "-")) continue;
        const task = item.tasks.find((t) => t.status !== "done");
        if (task) {
          taskSource = task.source ?? `${task.itemSlug}/${task.slug}`;
          break;
        }
      }
    }
    if (taskSource) {
      await ctx.backlogmd.updateTaskStatus(taskSource, "in-progress");
      ctx.notifyClients();
      return true;
    }
  } catch (err) {
    console.error("[backlogmd-serve] Report in-progress backlog update:", (err as Error).message);
  }
  return false;
}

function workerKey(body: WorkerReportBody): string {
  const name = (body.name ?? "worker").trim() || "worker";
  const role = (body.role ?? "").trim() || "worker";
  return `${name}:${role}`;
}

export async function postWorkerReport(
  ctx: AppContext,
  request: FastifyRequest<{ Body: WorkerReportBody }>,
  reply: FastifyReply,
): Promise<void> {
  const body = request.body ?? {};
  const key = workerKey(body);

  if (body.status === "in-progress") {
    const updated = await updateBacklogInProgress(ctx, body);
    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : undefined;
    if (itemId && !updated) {
      ctx.setClaimedItem(key, itemId);
    }
  } else if (body.status === "idle") {
    ctx.setClaimedItem(key, null);
  }

  const state = ctx.reportWorker(body);
  ctx.broadcastStatus();
  reply.code(200).send(state);
}
