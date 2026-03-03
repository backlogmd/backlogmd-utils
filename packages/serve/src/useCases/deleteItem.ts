import type { FastifyRequest, FastifyReply } from "fastify";
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

  try {
    await ctx.backlogmd.removeItem(slug);
    ctx.notifyClients();
    await reply.code(200).type("application/json").send({ ok: true });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("not found")) {
      await reply.code(404).type("application/json").send({ error: message });
    } else {
      console.error("[backlogmd-serve] deleteItem error:", message);
      await reply.code(500).type("application/json").send({ error: message });
    }
  }
}
