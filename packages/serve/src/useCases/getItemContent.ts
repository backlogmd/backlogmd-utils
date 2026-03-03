import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

interface Params {
  encodedSlug?: string;
}

/**
 * GET /api/items/:encodedSlug/content
 * Returns the plain-text body of the work item index (DESCRIPTION, CONTEXT, etc.).
 */
export async function getItemContent(
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
    const { content } = await ctx.backlogmd.getItemContent(slug);
    await reply.type("application/json").send({ content });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("not found")) {
      await reply.code(404).type("application/json").send({ error: message });
    } else {
      console.error("[backlogmd-serve] getItemContent error:", message);
      await reply.code(500).type("application/json").send({ error: message });
    }
  }
}
