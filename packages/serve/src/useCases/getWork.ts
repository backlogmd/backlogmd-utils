import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";
import { getWorkerAssignments } from "./getWorkerAssignments.js";

/** Delegates to getWorkerAssignments (same API). */
export async function getWork(
    ctx: AppContext,
    request: FastifyRequest<{ Querystring: { name?: string; role?: string } }>,
    reply: FastifyReply,
): Promise<void> {
    return getWorkerAssignments(ctx, request as never, reply);
}
