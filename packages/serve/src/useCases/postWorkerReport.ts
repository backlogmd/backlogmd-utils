import type { FastifyRequest, FastifyReply } from "fastify";
import { BacklogDocument } from "@backlogmd/writer";
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
    const doc = await BacklogDocument.load(ctx.backlogDir);
    let taskSource: string | undefined;
    if (taskId) {
      const task = doc.model.tasks.find(
        (t) => t.source === taskId || t.slug === taskId,
      );
      taskSource = task?.source;
    } else if (itemId) {
      const task = doc.model.tasks.find(
        (t) =>
          (t.itemSlug === itemId || t.itemSlug.startsWith(itemId + "-")) &&
          t.status !== "done",
      );
      taskSource = task?.source;
    }
    if (taskSource) {
      const changeset = doc.changeTaskStatus(taskSource, "in-progress");
      await doc.commit(changeset);
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
