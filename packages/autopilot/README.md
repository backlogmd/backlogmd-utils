# @backlogmd/autopilot

LangChain.js agent for BacklogMD that uses the [serve](/packages/serve) `/api/chat` endpoint as its LLM.

## Usage

1. Start the backlogmd-serve server (with the `/api/chat` route):

   ```bash
   npm run serve
   ```

2. Create and run the agent:

   ```ts
   import { createChatAgent } from "@backlogmd/autopilot";

   const executor = await createChatAgent({
     serveBaseUrl: "http://localhost:3141",
   });

   const result = await executor.invoke({
     input: "What's on my backlog?",
   });
   console.log(result.output);
   ```

## API

- **`createChatAgent(options)`** – Returns a LangChain `AgentExecutor` that uses the serve `/api/chat` endpoint. Options:
  - `serveBaseUrl` – Base URL of the serve server (e.g. `http://localhost:3141`).
  - `chatPath?` – Path to the chat endpoint (default: `/api/chat`).
  - `tools?` – Optional extra `ToolInterface[]` tools.
- **`ServeChatModel`** – Custom LangChain chat model that `POST`s messages to serve’s chat endpoint. Use directly if you only need the model without the ReAct agent.

## Serve `/api/chat` contract

- **Request:** `POST /api/chat` with body `{ messages: Array<{ role: "user" | "assistant" | "system", content: string }> }`.
- **Response:** `{ message: { role: "assistant", content: string } }`.

The agent uses a ReAct-style loop and includes a built-in `get_backlog_summary` tool. You can add more tools via `createChatAgent({ ..., tools: [...] })`.
