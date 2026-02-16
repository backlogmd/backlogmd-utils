import {
  BaseChatModel,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import type { BaseMessage } from "@langchain/core/messages";
import { AIMessageChunk } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";

const DEFAULT_CHAT_PATH = "/api/chat";

export interface ServeChatModelParams extends BaseChatModelParams {
  /** Base URL of the backlogmd-serve server (e.g. http://localhost:3141) */
  baseUrl: string;
  /** Path to the chat endpoint (default: /api/chat) */
  chatPath?: string;
}

/**
 * LangChain chat model that calls the backlogmd-serve POST /api/chat endpoint.
 * Use this as the model for createAgent so the agent uses the serve chat backend.
 */
export class ServeChatModel extends BaseChatModel<ServeChatModelParams> {
  baseUrl: string;
  chatPath: string;

  constructor(params: ServeChatModelParams) {
    super(params);
    this.baseUrl = params.baseUrl.replace(/\/$/, "");
    this.chatPath = params.chatPath ?? DEFAULT_CHAT_PATH;
  }

  _llmType(): string {
    return "backlogmd_serve_chat";
  }

  async _generate(
    messages: BaseMessage[],
    _options: Record<string, unknown>,
  ): Promise<ChatResult> {
    const roleMap: Record<string, "user" | "assistant" | "system"> = {
      human: "user",
      ai: "assistant",
      system: "system",
    };
    const serialized = messages.map((m) => {
      const type = (m as { _getType?: () => string })._getType?.() ?? "human";
      return {
        role: roleMap[type] ?? "user",
        content: typeof m.content === "string" ? m.content : String(m.content),
      };
    });

    const url = `${this.baseUrl}${this.chatPath}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: serialized }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Serve chat failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { message?: { role?: string; content?: string } };
    const content = data.message?.content ?? "";

    return {
      generations: [
        {
          message: new AIMessageChunk({ content }),
          text: content,
        },
      ],
    };
  }
}
