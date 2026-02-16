import { createReactAgent, AgentExecutor } from "langchain/agents";
import { DynamicTool } from "langchain/tools";
import { PromptTemplate } from "@langchain/core/prompts";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ToolInterface } from "@langchain/core/tools";
import { ServeChatModel } from "./chatModel.js";
import { loadBacklogmdSkill } from "./skills.js";

const REACT_PREFIX_BASE = `Answer the following questions as best you can. You have access to the following tools:`;
const REACT_FORMAT = `Use the following format. You must include every line exactly as shown.

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, must be exactly one of [{tool_names}]
Action Input: the input to the action (use "" if the tool needs no input)
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Important: When using a tool, you must output "Action:" then "Action Input:" on the next line. Do not omit "Action Input:" even for tools that take no input (use "").
If you can answer from the BacklogMD context or the question alone, go straight to "Thought: I now know the final answer" and "Final Answer:" without calling a tool.`;
const REACT_SUFFIX = `Begin!

Question: {input}
Thought:{agent_scratchpad}`;

function getReactPrefix(): string {
  const skill = loadBacklogmdSkill();
  if (!skill.trim()) return REACT_PREFIX_BASE;
  return [REACT_PREFIX_BASE, "", "--- BacklogMD context (use this to reason about the backlog) ---", "", skill.trim(), ""].join("\n");
}

export interface CreateChatAgentOptions {
  /**
   * LLM to use. If provided, the agent runs in-process (e.g. inside the server).
   * If omitted, serveBaseUrl is required and the agent uses the remote /api/chat endpoint.
   */
  llm?: BaseChatModel;
  /** Base URL of the backlogmd-serve server (required when llm is not set) */
  serveBaseUrl?: string;
  /** Optional path to the chat endpoint (default: /api/chat), used only when llm is not set */
  chatPath?: string;
  /** Optional extra tools for the agent */
  tools?: ToolInterface[];
  /**
   * Max Thought/Action/Observation cycles before the agent is stopped (default: 15).
   * Increase if the agent often hits "Agent stopped due to max iterations".
   */
  maxIterations?: number;
}

/**
 * Creates a LangChain.js ReAct agent that uses the backlogmd-serve /api/chat endpoint
 * as its LLM. The agent can be invoked with { input: string } and will reason and call
 * tools (including a built-in get_backlog_summary tool) and use the serve chat for
 * language model responses.
 */
const DEFAULT_MAX_ITERATIONS = 15;

export async function createChatAgent(options: CreateChatAgentOptions) {
  const {
    llm,
    serveBaseUrl,
    chatPath,
    tools: extraTools = [],
    maxIterations = DEFAULT_MAX_ITERATIONS,
  } = options;

  const model =
    llm ??
    (serveBaseUrl
      ? new ServeChatModel({ baseUrl: serveBaseUrl, chatPath })
      : (() => {
          throw new Error(
            "createChatAgent requires either llm or serveBaseUrl",
          );
        })());

  const getBacklogSummary = new DynamicTool({
    name: "get_backlog_summary",
    description:
      "Get a summary of the current backlog. The user may have a serve instance running; suggest they call GET /api/backlog on the serve base URL.",
    func: async () =>
      "Use the /api/backlog or /api/backlog.json endpoint on the same serve base URL to fetch the current backlog.",
  });

  const tools: ToolInterface[] = [getBacklogSummary, ...extraTools];

  const prompt = PromptTemplate.fromTemplate(
    [getReactPrefix(), "\n\n{tools}\n\n", REACT_FORMAT, "\n\n", REACT_SUFFIX].join(
      "",
    ),
  );

  const agent = await createReactAgent({
    llm: model,
    tools,
    prompt,
    streamRunnable: false,
  });

  const executor = new AgentExecutor({
    agent,
    tools,
    maxIterations,
    returnIntermediateSteps: false,
    handleParsingErrors:
      "Your last output did not use the required format. When using a tool you must output exactly: 'Action: <tool_name>' then on the next line 'Action Input: <input>'. Use Action Input: \"\" if the tool needs no input. When done, use 'Thought: I now know the final answer' then 'Final Answer: <your answer>'.",
  });

  return executor;
}
