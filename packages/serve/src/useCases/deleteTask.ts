import path from "node:path";
import fs from "node:fs";
import type { FastifyRequest, FastifyReply } from "fastify";
import { buildBacklogOutput } from "@backlogmd/parser";
import type { AppContext } from "../context.js";

interface Params {
  encodedSource?: string;
}

/**
 * DELETE /api/tasks/:encodedSource
 * Removes the task file (and its feedback file if present) from the backlog.
 */
export async function deleteTask(
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

  let output;
  try {
    output = buildBacklogOutput(ctx.backlogDir);
  } catch (err) {
    console.error("[backlogmd-serve] deleteTask parse error:", (err as Error).message);
    await reply.code(500).type("application/json").send({
      error: (err as Error).message,
    });
    return;
  }

  const task = output.tasks.find(
    (t) => t.source === taskSource || `${t.itemSlug}/${t.priority}` === taskSource,
  );
  if (!task) {
    await reply.code(404).type("application/json").send({
      error: `Task not found: ${taskSource}`,
    });
    return;
  }

  const rootDir = path.resolve(ctx.backlogDir);
  const taskPath = path.join(rootDir, task.source);
  if (!fs.existsSync(taskPath)) {
    await reply.code(404).type("application/json").send({
      error: `Task file not found: ${task.source}`,
    });
    return;
  }

  try {
    fs.unlinkSync(taskPath);
    if (task.feedback?.source) {
      const feedbackPath = path.join(rootDir, task.feedback.source);
      if (fs.existsSync(feedbackPath)) {
        fs.unlinkSync(feedbackPath);
      }
    }
  } catch (err) {
    console.error("[backlogmd-serve] deleteTask fs error:", (err as Error).message);
    await reply.code(500).type("application/json").send({
      error: (err as Error).message,
    });
    return;
  }

  ctx.notifyClients();
  await reply.code(200).type("application/json").send({ ok: true });
}
