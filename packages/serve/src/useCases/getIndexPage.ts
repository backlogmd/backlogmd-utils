import type { FastifyRequest, FastifyReply } from "fastify";
import { renderHtml } from "../html.js";
import { errorBacklogStateDto } from "../lib/errorOutput.js";
import type { AppContext } from "../context.js";

export async function getIndexPage(
  ctx: AppContext,
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let doc;
  try {
    doc = ctx.backlogmd.getDocument();
  } catch (err) {
    console.error("[backlogmd-serve] Parse error:", (err as Error).message);
    doc = errorBacklogStateDto(ctx.backlogDir, err as Error);
  }

  if (doc.validation.errors.length > 0) {
    for (const e of doc.validation.errors) {
      console.error(
        `[backlogmd-serve] ${e.code}: ${e.message}${e.source ? ` (${e.source})` : ""}`,
      );
    }
  }

  const html = renderHtml(doc);
  await reply.type("text/html").send(html);
}
