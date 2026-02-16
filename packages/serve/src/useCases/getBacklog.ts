import type { FastifyRequest, FastifyReply } from "fastify";
import { buildBacklogOutput } from "@backlogmd/parser";
import { errorOutput } from "../lib/errorOutput.js";
import type { AppContext } from "../context.js";

export async function getBacklog(
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

  await reply.type("application/json").send(output);
}
