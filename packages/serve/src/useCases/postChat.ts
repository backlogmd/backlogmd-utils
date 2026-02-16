import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppContext } from "../context.js";

interface Body {
  messages?: Array<{ role?: string; content?: string }>;
}

export async function postChat(
  ctx: AppContext,
  request: FastifyRequest<{ Body: Body }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = request.body as Body | undefined;
  const messages = parsed?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    await reply.code(400).type("application/json").send({
      error: "Request body must include a non-empty messages array",
    });
    return;
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userInput =
    typeof lastUser?.content === "string"
      ? lastUser.content
      : "Send a message with role 'user' and content to get a reply.";

  const agent = await ctx.getChatAgent();
  if (agent) {
    try {
      const result = await agent.invoke({ input: userInput });
      const content =
        typeof result?.output === "string" ? result.output : String(result?.output ?? "");
      ctx.notifyClients();
      await reply.type("application/json").send({
        message: { role: "assistant" as const, content },
      });
    } catch (err) {
      const e = err as Error;
      console.error("[backlogmd-serve] Chat agent error:", e.message, e.stack ?? "");
      await reply.code(500).type("application/json").send({
        error: "Chat failed",
        message: e.message,
      });
    }
  } else {
    await reply.type("application/json").send({
      message: {
        role: "assistant" as const,
        content: process.env.OPENAI_API_KEY
          ? "Agent is starting up; try again in a moment."
          : `Echo (stub): ${userInput}. Set OPENAI_API_KEY to enable the live agent.`,
      },
    });
  }
}
