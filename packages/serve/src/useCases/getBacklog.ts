import type { FastifyRequest, FastifyReply } from "fastify";
import type { BacklogStateDto } from "@backlogmd/types";
import { errorBacklogStateDto } from "../lib/errorOutput.js";
import type { AppContext } from "../context.js";

export async function getBacklog(
  ctx: AppContext,
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let doc: BacklogStateDto;
  try {
    ctx.backlogmd.refresh();
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

  await reply.type("application/json").send(doc);
}
