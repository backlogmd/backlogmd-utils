import type { FastifyRequest, FastifyReply } from "fastify";
import { buildBacklogOutput } from "@backlogmd/parser";
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

  let output;
  try {
    output = buildBacklogOutput(ctx.backlogDir);
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
    console.log(`[assignments] name=${name} backlogDir=${ctx.backlogDir} entries=${output.entries.length} tasks=${output.tasks.length}`);
    for (const e of output.entries) {
      const match = assigneeMatches(e.assignee);
      if (match || e.assignee) {
        console.log(`[assignments] entry ${e.slug} assignee=${e.assignee ?? "(none)"} match=${match} status=${e.status}`);
      }
    }
  }

  // Only return work that is not done and not in-progress so workers don't re-pick the same work.
  for (const task of output.tasks) {
    if (
      assigneeMatches(task.assignee) &&
      task.status !== "done" &&
      task.status !== "in-progress"
    ) {
      assignments.push({ taskId: task.source, itemId: task.itemSlug });
    }
  }
  for (const entry of output.entries) {
    if (!assigneeMatches(entry.assignee) || entry.status === "done") continue;
    if (ctx.isItemClaimed(entry.slug)) {
      if (debug) console.log(`[assignments] skip ${entry.slug}: claimed`);
      continue;
    }
    const tasksForItem = output.tasks.filter((t) => t.itemSlug === entry.slug);
    const allTasksDone = tasksForItem.length > 0 && tasksForItem.every((t) => t.status === "done");
    if (allTasksDone) {
      if (debug) console.log(`[assignments] skip ${entry.slug}: allTasksDone`);
      continue;
    }
    // Don't show item if any task is in-progress (worker already claimed it via report).
    const anyInProgress = tasksForItem.some((t) => t.status === "in-progress");
    if (anyInProgress) {
      if (debug) console.log(`[assignments] skip ${entry.slug}: anyInProgress`);
      continue;
    }
    const alreadyHasTaskForItem = assignments.some(
      (a) => a.itemId === entry.slug && a.taskId != null,
    );
    if (!alreadyHasTaskForItem) {
      assignments.push({ itemId: entry.slug });
      if (debug) console.log(`[assignments] add itemId=${entry.slug}`);
    }
  }

  if (debug) console.log(`[assignments] returning ${assignments.length} assignment(s)`);

  await reply.code(200).type("application/json").send({
    assignments,
  });
}
