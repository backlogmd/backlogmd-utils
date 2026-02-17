import { createReactAgent, AgentExecutor } from "@langchain/classic/agents";
import { DynamicTool } from "@langchain/core/tools";
import { PromptTemplate } from "@langchain/core/prompts";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ToolInterface } from "@langchain/core/tools";
import { BacklogCore } from "@backlogmd/core";
import { ServeChatModel } from "./chatModel.js";

const REACT_PREFIX = `You act as a staff engineer managing a backlog.

- When the user asks for help, what you can do, or what options they have: FIRST call the list_workers tool if it is available to get the worker list. Then in your Final Answer list EVERY tool you have access to by name and a one-line description (include add_work_item, list_workers, get_backlog_summary, get_backlog, and any other tools listed below), and list each worker by name and role. Do not skip any tool.

- When the user asks to add work (in any form — a sentence, a paragraph, a pasted spec, or bullet points): you MUST call add_work_item with a JSON that you derive from their message. Derive every field from the text:
  • title: A short, clear headline (3–8 words). Infer from the first sentence or main idea if they didn't give one (e.g. "users can't reset password" → "Fix password reset").
  • type: One of feat | fix | refactor | chore. Infer from context: feat = new capability or user-facing change; fix = bug, error, or correctness; refactor = code/structure improvement without behavior change; chore = tooling, config, docs, maintenance, cleanup.
  • description: The full substance of what they said — requirements, steps, acceptance criteria, or problem statement. Do not summarize or shorten; preserve all details, bullets, and links. If they only gave a title-like phrase, expand it into a one- or two-sentence description.
  • context: Optional. Use for references (ticket IDs, Figma links, docs), constraints ("must ship by Friday"), or follow-up notes. Omit if the user gave none.

Always call add_work_item with at least title and description. Never respond with "what title?" or "what type?" — infer from the message.

- When the user asks to add work you MUST output "Action: add_work_item" and then "Action Input: <json>". Do not skip the tool and reply with a confirmation — the item is only created when the tool runs. In your Final Answer, only say the work item was added if the Observation from the tool starts with "Created work item:". If the Observation starts with "Error:", tell the user what went wrong and do not claim the item was added.

Answer the following questions as best you can. You have access to the following tools:`;
const REACT_FORMAT = `Use the following format. You must include every line exactly as shown.

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, must be exactly one of [{tool_names}]
Action Input: the input to the action (use "" if the tool needs no input)
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

CRITICAL - Tool calls must use exactly this shape (two separate lines):
Action: add_work_item
Action Input: {{"title": "Add login page", "type": "feat", "description": "User can log in with email and password."}}

Do NOT output the tool name and input on one line. You MUST use two lines: first "Action: <tool_name>", then "Action Input: <json or string>". Do not omit "Action Input:" even for tools that take no input (use "").
If the user asked to add work, you MUST call add_work_item first — do not go straight to Final Answer. Only after you see the Observation from add_work_item may you give the Final Answer. If you can answer from the question alone (and the user did not ask to add work), go straight to "Thought: I now know the final answer" and "Final Answer:" without calling a tool.`;
const REACT_SUFFIX = `Begin!

Question: {input}
Thought:{agent_scratchpad}`;

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
  /**
   * Backlog root directory (e.g. .backlogmd). When set (and core is not), the agent loads
   * BacklogCore and gets add_work_item and related tools.
   */
  rootDir?: string;
  /**
   * Pre-loaded BacklogCore instance. When provided, the agent uses it for backlog tools
   * instead of loading from rootDir. Use this when the serve injects a single shared core.
   */
  core?: Awaited<ReturnType<typeof BacklogCore.load>>;
  /** Optional extra tools for the agent (e.g. get_backlog, list_workers from serve). */
  tools?: ToolInterface[];
  /**
   * Max Thought/Action/Observation cycles before the agent is stopped (default: 15).
   * Increase if the agent often hits "Agent stopped due to max iterations".
   */
  maxIterations?: number;
  /**
   * Optional callback invoked after any tool that mutates the backlog (e.g. add_work_item).
   * Use to notify SSE clients to refresh.
   */
  onBacklogChange?: () => void;
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
    rootDir,
    core: injectedCore,
    tools: extraTools = [],
    maxIterations = DEFAULT_MAX_ITERATIONS,
    onBacklogChange,
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

  const tools: ToolInterface[] = [];

  let core: Awaited<ReturnType<typeof BacklogCore.load>> | null = injectedCore ?? null;
  if (core === null && rootDir) {
    try {
      core = await BacklogCore.load({ rootDir });
    } catch (err) {
      console.error("[autopilot] Failed to load BacklogCore for rootDir:", (err as Error).message);
    }
  }
  if (core) {
      const coreInstance = core;
      tools.push(
        new DynamicTool({
          name: "add_work_item",
          description:
            "Add a new work item from the user's message. Input: JSON you derive from their text. Required: \"title\" (short headline, 3–8 words). Strongly recommended: \"description\" (full requirements/details — never omit or shorten what the user said). Optional: \"type\" (feat | fix | refactor | chore; infer from context), \"context\" (links, ticket IDs, constraints). You must always infer title and description from whatever the user wrote; never ask them for more — extract or expand. Example for \"login is broken on mobile\": {\"title\": \"Fix login on mobile\", \"type\": \"fix\", \"description\": \"Login is broken on mobile. User reported: ...\"}.",
          func: async (input: string) => {
            try {
              const parsed = JSON.parse(input || "{}") as {
                title?: string;
                type?: string;
                description?: string;
                context?: string;
              };
              const title = parsed?.title?.trim();
              if (!title) {
                return "Error: \"title\" is required and must be a non-empty string.";
              }
              const type = parsed.type as "feat" | "fix" | "refactor" | "chore" | undefined;
              const validTypes = ["feat", "fix", "refactor", "chore"];
              if (type !== undefined && !validTypes.includes(type)) {
                return `Error: "type" must be one of: ${validTypes.join(", ")}.`;
              }
              await coreInstance.addItem({
                title,
                type,
                description: parsed.description?.trim() || undefined,
                context: parsed.context?.trim() || undefined,
              });
              const state = coreInstance.getState();
              const added = state.items[state.items.length - 1];
              onBacklogChange?.();
              return `Created work item: ${added.slug} (${added.source}).`;
            } catch (err) {
              return `Error: ${(err as Error).message}`;
            }
          },
        }),
      );
  }

  const getBacklogSummary = new DynamicTool({
    name: "get_backlog_summary",
    description:
      "Get a summary of the current backlog. The user may have a serve instance running; suggest they call GET /api/backlog on the serve base URL.",
    func: async () =>
      "Use the /api/backlog or /api/backlog.json endpoint on the same serve base URL to fetch the current backlog.",
  });
  tools.push(getBacklogSummary, ...extraTools);

  const prompt = PromptTemplate.fromTemplate(
    [REACT_PREFIX, "\n\n{tools}\n\n", REACT_FORMAT, "\n\n", REACT_SUFFIX].join(
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
