import {
  createServer as createHttpServer,
  type Server,
  type ServerResponse,
  type IncomingMessage,
} from "node:http";
import { renderHtml } from "./html.js";
import { buildBacklogOutput } from "@backlogmd/parser";
import type { BacklogOutput, TaskStatus } from "@backlogmd/types";
import { BacklogDocument } from "@backlogmd/writer";
import { createChatAgent } from "@backlogmd/autopilot";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicTool } from "langchain/tools";
import type { AgentExecutor } from "langchain/agents";

const VALID_STATUSES: Set<string> = new Set([
  "open",
  "block",
  "in-progress",
  "done",
]);

export interface ServerResult {
  server: Server;
  notifyClients: () => void;
  close: () => void;
}

/**
 * Build an empty BacklogOutput with a single error entry.
 * Used as a fallback when the parser fails catastrophically.
 */
function errorOutput(backlogDir: string, err: Error): BacklogOutput {
  return {
    protocol: "backlogmd/v2",
    generatedAt: new Date().toISOString(),
    rootDir: backlogDir,
    entries: [],
    items: [],
    tasks: [],
    validation: {
      errors: [
        {
          code: "FATAL_PARSE_ERROR",
          message: `Failed to read backlog: ${err.message}`,
          source: "",
        },
      ],
      warnings: [],
    },
  };
}

/**
 * Read the full request body as a string.
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function createChatAgentForServer(
  backlogDir: string,
): Promise<AgentExecutor | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  try {
    const getBacklog = new DynamicTool({
      name: "get_backlog",
      description:
        "Get the current backlog (work items and tasks). Use this to answer questions about what is on the backlog.",
      func: async () => {
        const output = buildBacklogOutput(backlogDir);
        return JSON.stringify(
          {
            entries: output.entries?.length ?? 0,
            items: output.items?.length ?? 0,
            tasks: output.tasks?.length ?? 0,
            validationErrors: output.validation?.errors?.length ?? 0,
            summary: output.entries?.slice(0, 20) ?? [],
          },
          null,
          2,
        );
      },
    });
    return createChatAgent({
      llm: new ChatOpenAI({ temperature: 0 }),
      tools: [getBacklog],
    });
  } catch (err) {
    console.error("[backlogmd-serve] Failed to create chat agent:", (err as Error).message);
    return null;
  }
}

export function createServer(port: number, backlogDir: string): ServerResult {
  const clients = new Set<ServerResponse>();
  let chatAgentPromise: Promise<AgentExecutor | null> | null = null;

  const getChatAgent = (): Promise<AgentExecutor | null> => {
    if (!chatAgentPromise) {
      chatAgentPromise = createChatAgentForServer(backlogDir);
    }
    return chatAgentPromise;
  };

  // Start creating the agent at server startup so it is ready for /api/chat
  if (process.env.OPENAI_API_KEY) {
    void getChatAgent();
  }

  const requestHandler = async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      let output: BacklogOutput;
      try {
        output = buildBacklogOutput(backlogDir);
      } catch (err) {
        console.error("[backlogmd-serve] Parse error:", (err as Error).message);
        output = errorOutput(backlogDir, err as Error);
      }

      if (output.validation.errors.length > 0) {
        for (const e of output.validation.errors) {
          console.error(`[backlogmd-serve] ${e.code}: ${e.message}${e.source ? ` (${e.source})` : ""}`);
        }
      }

      const html = renderHtml(output);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }

    if (url.pathname === "/api/backlog" || url.pathname === "/api/backlog.json") {
      let output: BacklogOutput;
      try {
        output = buildBacklogOutput(backlogDir);
      } catch (err) {
        console.error("[backlogmd-serve] Parse error:", (err as Error).message);
        output = errorOutput(backlogDir, err as Error);
      }

      if (output.validation.errors.length > 0) {
        for (const e of output.validation.errors) {
          console.error(`[backlogmd-serve] ${e.code}: ${e.message}${e.source ? ` (${e.source})` : ""}`);
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(output));
      return;
    }

    // PATCH /api/tasks/<encoded-source> — update a task's status
    if (req.method === "PATCH" && url.pathname.startsWith("/api/tasks/")) {
      const encodedSource = url.pathname.slice("/api/tasks/".length);
      const taskSource = decodeURIComponent(encodedSource);

      if (!taskSource) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing task source" }));
        return;
      }

      let body: string;
      try {
        body = await readBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to read request body" }));
        return;
      }

      let parsed: { status?: string };
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      const newStatus = parsed.status;
      if (!newStatus || !VALID_STATUSES.has(newStatus)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: `Invalid status "${newStatus}". Must be one of: ${[...VALID_STATUSES].join(", ")}`,
          }),
        );
        return;
      }

      try {
        const doc = await BacklogDocument.load(backlogDir);
        const changeset = doc.changeTaskStatus(
          taskSource,
          newStatus as TaskStatus,
        );
        await doc.commit(changeset);

        // Notify all SSE clients to refresh
        notifyClients();

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        const message = (err as Error).message;
        // If the task is not found, return 404
        if (message.includes("not found")) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        } else {
          console.error("[backlogmd-serve] PATCH error:", message);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        }
      }
      return;
    }

    // POST /api/chat — chat endpoint; uses in-server agent when OPENAI_API_KEY is set
    if (req.method === "POST" && url.pathname === "/api/chat") {
      let body: string;
      try {
        body = await readBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to read request body" }));
        return;
      }

      let parsed: { messages?: Array<{ role?: string; content?: string }> };
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      const messages = parsed.messages;
      if (!Array.isArray(messages) || messages.length === 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "Request body must include a non-empty messages array" }),
        );
        return;
      }

      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const userInput =
        typeof lastUser?.content === "string"
          ? lastUser.content
          : "Send a message with role 'user' and content to get a reply.";

      const agent = await getChatAgent();
      if (agent) {
        try {
          const result = await agent.invoke({ input: userInput });
          const content =
            typeof result?.output === "string"
              ? result.output
              : String(result?.output ?? "");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              message: { role: "assistant" as const, content },
            }),
          );
        } catch (err) {
          console.error("[backlogmd-serve] Chat agent error:", (err as Error).message);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Chat failed",
              message: (err as Error).message,
            }),
          );
        }
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: {
              role: "assistant" as const,
              content: process.env.OPENAI_API_KEY
                ? "Agent is starting up; try again in a moment."
                : `Echo (stub): ${userInput}. Set OPENAI_API_KEY to enable the live agent.`,
            },
          }),
        );
      }
      return;
    }

    if (url.pathname === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("\n");
      clients.add(res);
      req.on("close", () => {
        clients.delete(res);
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  };

  const server = createHttpServer(requestHandler);

  const notifyClients = () => {
    const message = "data: reload\n\n";
    for (const client of clients) {
      client.write(message);
    }
  };

  const close = () => {
    for (const client of clients) {
      client.end();
    }
    clients.clear();
    server.close();
  };

  server.listen(port);

  return { server, notifyClients, close };
}
