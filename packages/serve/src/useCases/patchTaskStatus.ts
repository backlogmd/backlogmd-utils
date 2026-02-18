import type { FastifyRequest, FastifyReply } from "fastify";
import { VALID_STATUSES } from "../lib/validStatuses.js";
import type { AppContext } from "../context.js";

interface Params {
  encodedSource?: string;
}

interface Body {
  status?: string;
}

export async function patchTaskStatus(
  ctx: AppContext,
  request: FastifyRequest<{ Params: Params; Body: Body }>,
  reply: FastifyReply,
): Promise<void> {
  const taskSource = request.params.encodedSource
    ? decodeURIComponent(request.params.encodedSource)
    : "";

  if (!taskSource) {
    await reply.code(400).type("application/json").send({ error: "Missing task source" });
    return;
  }

  const body = request.body as Body | undefined;
  const newStatus = body?.status;
  if (!newStatus || !VALID_STATUSES.has(newStatus)) {
    await reply.code(400).type("application/json").send({
      error: `Invalid status "${newStatus}". Must be one of: ${[...VALID_STATUSES].join(", ")}`,
    });
    return;
  }

  try {
    await ctx.backlogmd.updateTaskStatus(taskSource, newStatus as import("@backlogmd/types").TaskStatus);
    ctx.notifyClients();
    await reply.type("application/json").send({ ok: true });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("not found")) {
      await reply.code(404).type("application/json").send({ error: message });
    } else {
      console.error("[backlogmd-serve] PATCH error:", message);
      await reply.code(500).type("application/json").send({ error: message });
    }
  }
}
