import path from "node:path";
import fs from "node:fs";
import type { FastifyRequest, FastifyReply } from "fastify";
import { buildBacklogOutput } from "@backlogmd/parser";
import type { AppContext } from "../context.js";

interface Params {
  encodedSlug?: string;
}

/**
 * DELETE /api/items/:encodedSlug
 * Removes the work item directory (work/<slug>/ including index.md and all task files).
 */
export async function deleteItem(
  ctx: AppContext,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
): Promise<void> {
  const slug = request.params.encodedSlug ? decodeURIComponent(request.params.encodedSlug) : "";

  if (!slug) {
    await reply.code(400).type("application/json").send({ error: "Missing item slug" });
    return;
  }

  let output;
  try {
    output = buildBacklogOutput(ctx.backlogDir);
  } catch (err) {
    console.error("[backlogmd-serve] deleteItem parse error:", (err as Error).message);
    await reply.code(500).type("application/json").send({
      error: (err as Error).message,
    });
    return;
  }

  const entry = output.entries.find((e) => e.slug === slug);
  if (!entry) {
    await reply.code(404).type("application/json").send({
      error: `Item not found: ${slug}`,
    });
    return;
  }

  const rootDir = path.resolve(ctx.backlogDir);
  const workDir = path.join(rootDir, "work");
  const itemDir = path.join(workDir, slug);

  if (!fs.existsSync(itemDir) || !fs.statSync(itemDir).isDirectory()) {
    await reply.code(404).type("application/json").send({
      error: `Item directory not found: work/${slug}`,
    });
    return;
  }

  try {
    fs.rmSync(itemDir, { recursive: true });
  } catch (err) {
    console.error("[backlogmd-serve] deleteItem fs error:", (err as Error).message);
    await reply.code(500).type("application/json").send({
      error: (err as Error).message,
    });
    return;
  }

  ctx.notifyClients();
  await reply.code(200).type("application/json").send({ ok: true });
}
