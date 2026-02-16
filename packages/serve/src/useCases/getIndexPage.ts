import type { FastifyRequest, FastifyReply } from "fastify";
import { buildBacklogOutput } from "@backlogmd/parser";
import { renderHtml } from "../html.js";
import { errorOutput } from "../lib/errorOutput.js";
import type { AppContext } from "../context.js";

export async function getIndexPage(
  ctx: AppContext,
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let output;
  try {
    output = buildBacklogOutput(ctx.backlogDir);
  } catch (err) {
    console.error("[backlogmd-serve] Parse error:", (err as Error).message);
    output = errorOutput(ctx.backlogDir, err as Error);
  }

  if (output.validation.errors.length > 0) {
    for (const e of output.validation.errors) {
      console.error(
        `[backlogmd-serve] ${e.code}: ${e.message}${e.source ? ` (${e.source})` : ""}`,
      );
    }
  }

  const html = renderHtml(output);
  await reply.type("text/html").send(html);
}
