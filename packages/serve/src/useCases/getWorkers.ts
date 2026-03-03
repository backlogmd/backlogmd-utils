import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

export async function getWorkers(
  ctx: AppContext,
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const workers = ctx.getWorkerStates();
  reply.code(200).send({ workers });
}
