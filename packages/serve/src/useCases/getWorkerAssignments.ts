import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

/**
 * Returns the list of available work (assignments) for the requesting worker
 * by reading the backlog. Assignee is stored in the backlog document, so
 * after a server reload the list is still correct.
 * Query: name (required). role is optional; each worker knows its role.
 * Match: assignee === name or assignee starts with "name:".
 * Response: 200 with { assignments: { taskId?: string; itemId?: string }[] }.
 */
export async function getWorkerAssignments(
  ctx: AppContext,
  request: FastifyRequest<{
    Querystring: { name?: string; role?: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  const name = typeof request.query?.name === "string" ? request.query.name.trim() : "";
  if (!name) {
    await reply.code(400).type("application/json").send({
      error: "Missing name query",
    });
    return;
  }

  function assigneeMatches(assignee: string | undefined): boolean {
    if (!assignee) return false;
    return assignee === name || assignee.startsWith(name + ":");
  }

  let doc;
  try {
    doc = ctx.backlogmd.getDocument();
  } catch (err) {
    console.error("[backlogmd-serve] Assignments parse error:", (err as Error).message);
    await reply.code(500).type("application/json").send({
      error: (err as Error).message,
    });
    return;
  }

  const assignments: { taskId?: string; itemId?: string }[] = [];
  const debug = process.env.BACKLOGMD_DEBUG_ASSIGNMENTS === "1";

  if (debug) {
    const totalTasks = doc.work.reduce((n, w) => n + w.tasks.length, 0);
    console.log(`[assignments] name=${name} backlogDir=${ctx.backlogDir} work=${doc.work.length} tasks=${totalTasks}`);
    for (const w of doc.work) {
      const taskAssignees = w.tasks.map((t) => t.assignee).filter(Boolean);
      const match = taskAssignees.some((a) => assigneeMatches(a));
      if (match || taskAssignees.length) {
        console.log(`[assignments] item ${w.slug} status=${w.status} match=${match}`);
      }
    }
  }

  for (const item of doc.work) {
    for (const task of item.tasks) {
      if (
        assigneeMatches(task.assignee) &&
        task.status !== "done" &&
        task.status !== "in-progress"
      ) {
        const taskId = task.source ?? `${task.itemSlug}/${task.slug}`;
        assignments.push({ taskId, itemId: task.itemSlug });
      }
    }
  }
  for (const item of doc.work) {
    const itemAssignedToWorker =
      assigneeMatches(item.assignee) || item.tasks.some((t) => assigneeMatches(t.assignee));
    if (!itemAssignedToWorker || item.status === "done") continue;
    if (ctx.isItemClaimed(item.slug)) {
      if (debug) console.log(`[assignments] skip ${item.slug}: claimed`);
      continue;
    }
    const allTasksDone =
      item.tasks.length > 0 && item.tasks.every((t) => t.status === "done");
    if (allTasksDone) {
      if (debug) console.log(`[assignments] skip ${item.slug}: allTasksDone`);
      continue;
    }
    const anyInProgress = item.tasks.some((t) => t.status === "in-progress");
    if (anyInProgress) {
      if (debug) console.log(`[assignments] skip ${item.slug}: anyInProgress`);
      continue;
    }
    const alreadyHasTaskForItem = assignments.some(
      (a) => a.itemId === item.slug && a.taskId != null,
    );
    if (!alreadyHasTaskForItem) {
      assignments.push({ itemId: item.slug });
      if (debug) console.log(`[assignments] add itemId=${item.slug}`);
    }
  }

  if (debug) console.log(`[assignments] returning ${assignments.length} assignment(s)`);

  await reply.code(200).type("application/json").send({
    assignments,
  });
}
