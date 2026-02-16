import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createChatAgent } from "./agent.js";
import { ServeChatModel } from "./chatModel.js";
import { HumanMessage } from "@langchain/core/messages";
import { BacklogCore } from "@backlogmd/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../../../tests/fixtures/spec-v4");

describe("ServeChatModel", () => {
  const baseUrl = "http://localhost:9999";

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === `${baseUrl}/api/chat` && init?.method === "POST") {
          const body = JSON.parse((init.body as string) ?? "{}");
          const messages = body.messages ?? [];
          const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === "user");
          const content = lastUser?.content
            ? `Echo: ${lastUser.content}`
            : "No user message";
          return new Response(
            JSON.stringify({ message: { role: "assistant", content } }),
            { headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("Not Found", { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls serve /api/chat and returns AI message", async () => {
    const model = new ServeChatModel({ baseUrl });
    const result = await model.invoke([new HumanMessage("Hello")]);
    expect(result.content).toBe("Echo: Hello");
  });
});

describe("createChatAgent", () => {
  const baseUrl = "http://localhost:9999";

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === `${baseUrl}/api/chat` && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              message: {
                role: "assistant",
                content:
                  "Thought: I have the answer\nFinal Answer: You can GET /api/backlog for the backlog.",
              },
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("Not Found", { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an executor that can be invoked", async () => {
    const executor = await createChatAgent({ serveBaseUrl: baseUrl });
    expect(executor).toBeDefined();
    expect(typeof executor.invoke).toBe("function");
    const result = await executor.invoke({
      input: "How do I get the backlog?",
    });
    expect(result).toBeDefined();
    expect(result.output).toBeDefined();
  }, 10000);

  it("accepts optional core and returns executor without loading from rootDir", async () => {
    const core = await BacklogCore.load({ rootDir: fixturePath });
    const executor = await createChatAgent({
      serveBaseUrl: baseUrl,
      core,
    });
    expect(executor).toBeDefined();
    expect(typeof executor.invoke).toBe("function");
  });
});
