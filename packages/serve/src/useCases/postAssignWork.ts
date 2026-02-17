import path from "node:path";
import type { FastifyRequest, FastifyReply } from "fastify";
import { GitProvider } from "@backlogmd/vcs";
import { BacklogDocument } from "@backlogmd/writer";
import type { AppContext } from "../context.js";

export interface AssignWorkBody {
  workerId?: string;
  taskId?: string;
  itemId?: string;
}

function sanitizeForPath(s: string): string {
  return s.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").slice(0, 64);
}

function resolveGitRoot(backlogDir: string): string {
  const normalized = path.normalize(backlogDir);
  if (normalized.endsWith(".backlogmd") || normalized.includes(path.sep + ".backlogmd")) {
    return path.dirname(backlogDir);
  }
  return backlogDir;
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

  const gitRoot = resolveGitRoot(ctx.backlogDir);
  const worktreesBase = `${gitRoot}-worktrees`;
  const slug = taskId ?? itemId ?? "work";
  const createBranch = `assign/${sanitizeForPath(workerId)}/${sanitizeForPath(slug)}`;
  const worktreePath = path.join(
    worktreesBase,
    `assign-${sanitizeForPath(workerId)}-${Date.now()}`,
  );

  const git = new GitProvider(gitRoot);
  let isRepo = await git.isRepo();
  if (!isRepo) {
    const initResult = await GitProvider.init(gitRoot);
    if (!initResult.success) {
      await reply.code(500).type("application/json").send({
        error: initResult.error ?? "Failed to initialize git repository",
      });
      return;
    }
    await git.stageAll();
    const commitResult = await git.commit("initial");
    if (!commitResult.success) {
      await reply.code(500).type("application/json").send({
        error: commitResult.error ?? "Initial commit failed; ensure the project has at least one file",
      });
      return;
    }
  }

  let worktreePathToUse: string;
  const worktrees = await git.listWorktrees();
  const existingWorktree = worktrees.find((w) => w.branch === createBranch);
  if (existingWorktree) {
    worktreePathToUse = existingWorktree.path;
  } else {
    const worktreeResult = await git.createWorktree(worktreePath, {
      createBranch,
    });
    if (!worktreeResult.success) {
      await reply.code(500).type("application/json").send({
        error: worktreeResult.error ?? "Failed to create worktree",
      });
      return;
    }
    worktreePathToUse = worktreePath;
  }

  try {
    const doc = await BacklogDocument.load(ctx.backlogDir);
    if (taskId) {
      const changeset = doc.changeTaskAssignee(taskId, workerId);
      await doc.commit(changeset);
      if (process.env.BACKLOGMD_DEBUG_ASSIGNMENTS === "1") {
        console.log(`[assign] task assignee written workerId=${workerId} taskId=${taskId} backlogDir=${ctx.backlogDir}`);
      }
    }
    if (itemId) {
      const changeset = doc.changeItemAssignee(itemId, workerId);
      await doc.commit(changeset);
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
    worktreePath: worktreePathToUse,
    branch: createBranch,
  });
  ctx.notifyClients();
  ctx.triggerWorkAvailable();

  await reply.code(200).type("application/json").send({ ok: true });
}
