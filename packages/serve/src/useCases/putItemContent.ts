import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

interface Params {
  encodedSlug?: string;
}

interface Body {
  content?: string;
}

/**
 * PUT /api/items/:encodedSlug/content
 * Overwrites the work item index body (preserves METADATA). Reloads tree and notifies clients.
 */
export async function putItemContent(
  ctx: AppContext,
  request: FastifyRequest<{ Params: Params; Body: Body }>,
  reply: FastifyReply,
): Promise<void> {
  const slug = request.params.encodedSlug ? decodeURIComponent(request.params.encodedSlug) : "";

  if (!slug) {
    await reply.code(400).type("application/json").send({ error: "Missing item slug" });
    return;
  }

  const body = request.body as Body | undefined;
  const content = typeof body?.content === "string" ? body.content : "";

  try {
    await ctx.backlogmd.updateItemContent(slug, content);
    ctx.notifyClients();
    ctx.triggerWorkAvailable();
    await reply.type("application/json").send({ ok: true });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("not found")) {
      await reply.code(404).type("application/json").send({ error: message });
    } else {
      console.error("[backlogmd-serve] putItemContent error:", message);
      await reply.code(500).type("application/json").send({ error: message });
    }
  }
}
