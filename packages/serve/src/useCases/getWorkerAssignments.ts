import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

/**
 * Returns the list of available work (assignments) for the requesting worker
 * by reading the backlog. Assignee is stored in the backlog document, so
 * after a server reload the list is still correct.
 * Query: name (optional). If omitted, returns all assignments with assignee set (for debug).
 * Match when name given: assignee === name or assignee starts with "name:".
 * Response: 200 with { assignments: { taskId?: string; itemId?: string; assignee?: string }[] }.
 */
export async function getWorkerAssignments(
  ctx: AppContext,
  request: FastifyRequest<{
    Querystring: { name?: string; role?: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  const name = typeof request.query?.name === "string" ? request.query.name.trim() : "";
  const allWorkers = !name;

  function assigneeMatches(assignee: string | undefined): boolean {
    if (!assignee) return false;
    if (allWorkers) return true;
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

  const assignments: { taskId?: string; itemId?: string; assignee?: string }[] = [];
  const debug = process.env.BACKLOGMD_DEBUG_ASSIGNMENTS === "1";

  if (debug) {
    const totalTasks = doc.work.reduce((n, w) => n + w.tasks.length, 0);
    console.log(
      `[assignments] name=${name || "(all)"} backlogDir=${ctx.backlogDir} work=${doc.work.length} tasks=${totalTasks}`,
    );
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
        const taskId = `${task.itemSlug}/${task.priority}`;
        assignments.push(
          allWorkers && task.assignee
            ? { taskId, itemId: task.itemSlug, assignee: task.assignee }
            : { taskId, itemId: task.itemSlug },
        );
      }
    }
  }
  for (const item of doc.work) {
    const itemAssignedToWorker =
      assigneeMatches(item.assignee) || item.tasks.some((t) => assigneeMatches(t.assignee));
    if (!itemAssignedToWorker || item.status === "done") continue;
    if (!allWorkers && ctx.isItemClaimed(item.slug)) {
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
      const assignee =
        allWorkers && (item.assignee || item.tasks.find((t) => t.assignee)?.assignee);
      assignments.push(
        assignee != null ? { itemId: item.slug, assignee } : { itemId: item.slug },
      );
      if (debug) console.log(`[assignments] add itemId=${item.slug}`);
    }
  }

  if (debug) console.log(`[assignments] returning ${assignments.length} assignment(s)`);

  await reply.code(200).type("application/json").send({
    assignments,
  });
}
