import { createReactAgent, AgentExecutor } from "langchain/agents";
import { DynamicTool } from "langchain/tools";
import { PromptTemplate } from "@langchain/core/prompts";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ToolInterface } from "@langchain/core/tools";
import { BacklogCore } from "@backlogmd/core";
import type { Worker } from "@backlogmd/workers";
import { ServeChatModel } from "./chatModel.js";

/** A worker instance with a display name and role (e.g. planner, executor). */
export interface RegisteredWorker {
  worker: Worker;
  name: string;
  role: string;
}

const REACT_PREFIX = `You act as a staff engineer managing a backlog.
- When the user asks for help, what you can do, or what options they have: FIRST call the list_workers tool if it is available to get the worker list. Then in your Final Answer list EVERY tool you have access to by name and a one-line description (include add_work_item, assign_work_item, claim_work_item, start_working, list_workers, get_backlog_summary, get_backlog, and any other tools listed below), and list each worker by name and role. Do not skip any tool.
- When the user asks to add work: if they don't give an exact title, infer a short, clear title from what they said (e.g. "we need to fix the login bug" → title "Fix login bug"). If they don't say whether it's a feature, fix, chore, or refactor, decide from context: feat = new capability, fix = bug/correctness, refactor = improve code without changing behavior, chore = tooling/config/docs/maintenance.
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
Action: assign_work_item
Action Input: {{"itemSlug": "001-chore-project-foundation", "agent": "Planner"}}

Do NOT output the tool name and input on one line. You MUST use two lines: first "Action: <tool_name>", then "Action Input: <json or string>". Do not omit "Action Input:" even for tools that take no input (use "").
If you can answer from the question alone, go straight to "Thought: I now know the final answer" and "Final Answer:" without calling a tool.`;
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
   * BacklogCore and gets add_work_item, assign_work_item, etc.
   */
  rootDir?: string;
  /**
   * Pre-loaded BacklogCore instance. When provided, the agent uses it for backlog tools
   * instead of loading from rootDir. Use this when the serve injects a single shared core.
   */
  core?: Awaited<ReturnType<typeof BacklogCore.load>>;
  /**
   * List of workers (each with worker instance, name, and role). When provided, the agent
   * gets a list_workers tool and can mention them when the user asks for help.
   */
  workers?: RegisteredWorker[];
  /** Optional extra tools for the agent */
  tools?: ToolInterface[];
  /**
   * Max Thought/Action/Observation cycles before the agent is stopped (default: 15).
   * Increase if the agent often hits "Agent stopped due to max iterations".
   */
  maxIterations?: number;
  /**
   * Optional callback invoked after any tool that mutates the backlog (add_work_item,
   * assign_work_item, claim_work_item, start_working). Use to notify SSE clients to refresh.
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
    workers: workersList = [],
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
            "Add a new work item to the backlog. Input: JSON with \"title\" (string; if the user didn't give exact words, infer a concise title from their request) and optional \"type\" (feat | fix | refactor | chore; infer from context when the user doesn't specify). Example: {\"title\": \"Add login page\", \"type\": \"feat\"}.",
          func: async (input: string) => {
            try {
              const parsed = JSON.parse(input || "{}") as { title?: string; type?: string };
              const title = parsed?.title?.trim();
              if (!title) {
                return "Error: \"title\" is required and must be a non-empty string.";
              }
              const type = parsed.type as "feat" | "fix" | "refactor" | "chore" | undefined;
              const validTypes = ["feat", "fix", "refactor", "chore"];
              if (type !== undefined && !validTypes.includes(type)) {
                return `Error: "type" must be one of: ${validTypes.join(", ")}.`;
              }
              await coreInstance.addItem({ title, type });
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
      tools.push(
        new DynamicTool({
          name: "assign_work_item",
          description:
            "Assign a work item to an agent (worker). Input: JSON with \"itemSlug\" (string, required: full slug e.g. 001-feat-my-feature or id 001) and \"agent\" (string, required: worker name e.g. Camaron, Pastora, Planner). Example: {\"itemSlug\": \"001-chore-project-foundation\", \"agent\": \"Camaron\"}.",
          func: async (input: string) => {
            try {
              const parsed = JSON.parse(input || "{}") as { itemSlug?: string; agent?: string };
              const rawSlug = parsed?.itemSlug?.trim();
              const agent = parsed?.agent?.trim();
              if (!rawSlug || !agent) {
                return "Error: \"itemSlug\" and \"agent\" are required.";
              }
              const state = coreInstance.getState();
              const item = state.items.find(
                (i: { slug: string }) =>
                  i.slug === rawSlug ||
                  i.slug.startsWith(rawSlug + "-") ||
                  i.slug.split("-")[0] === rawSlug,
              );
              if (!item) {
                return `Error: Work item "${rawSlug}" not found.`;
              }
              await coreInstance.assignItem(item.slug, agent);
              const assignedWorker = workersList.find(
                (w) => w.name === agent || w.role === agent,
              );
              if (assignedWorker?.role?.toLowerCase() === "planner") {
                try {
                  await assignedWorker.worker.runPlanningForItem(item.slug);
                  onBacklogChange?.();
                  return `Assigned work item ${item.slug} to ${agent}. Planner has started working on the item.`;
                } catch (err) {
                  console.error("[autopilot] Planner run failed:", err);
                  return `Assigned ${item.slug} to ${agent}. Planner started but failed: ${(err as Error).message}`;
                }
              }
              onBacklogChange?.();
              return `Assigned work item ${item.slug} to ${agent}.`;
            } catch (err) {
              return `Error: ${(err as Error).message}`;
            }
          },
        }),
      );
      tools.push(
        new DynamicTool({
          name: "claim_work_item",
          description:
            "Have a worker claim a work item and start working. Use when the user says a worker should take an item. Input: JSON with \"itemSlug\" (string, required) and \"agent\" (string, required: worker name e.g. Planner, Camaron, Pastora). If the item has no tasks and is in plan, Planner will create tasks. If the item is open and has tasks, a staff-engineer will be assigned the item and all its tasks and will start working. Example: {\"itemSlug\": \"001-chore-project-foundation\", \"agent\": \"Planner\"}.",
          func: async (input: string) => {
            try {
              const parsed = JSON.parse(input || "{}") as { itemSlug?: string; agent?: string };
              const rawSlug = parsed?.itemSlug?.trim();
              const agent = parsed?.agent?.trim();
              if (!rawSlug || !agent) {
                return "Error: \"itemSlug\" and \"agent\" are required.";
              }
              const state = coreInstance.getState();
              const item = state.items.find(
                (i: { slug: string }) =>
                  i.slug === rawSlug ||
                  i.slug.startsWith(rawSlug + "-") ||
                  i.slug.split("-")[0] === rawSlug,
              );
              if (!item) {
                return `Error: Work item "${rawSlug}" not found.`;
              }
              const assignedWorker = workersList.find(
                (w) => w.name === agent || w.role === agent,
              );
              if (!assignedWorker) {
                return `Error: Worker "${agent}" not found.`;
              }
              const tasksForItem = state.tasks.filter(
                (t: { itemSlug: string }) => t.itemSlug === item.slug,
              );
              const isPlanner = assignedWorker.role?.toLowerCase() === "planner";
              const isStaffEngineer = assignedWorker.role?.toLowerCase() === "staff-engineer";

              await coreInstance.assignItem(item.slug, agent);

              if (tasksForItem.length === 0 && isPlanner) {
                try {
                  await assignedWorker.worker.runPlanningForItem(item.slug);
                  onBacklogChange?.();
                  return `Claimed work item ${item.slug} with ${agent}. Planner has created tasks.`;
                } catch (err) {
                  console.error("[autopilot] Planner run failed:", err);
                  return `Assigned ${item.slug} to ${agent}. Planner started but failed: ${(err as Error).message}`;
                }
              }

              if (tasksForItem.length > 0 && isStaffEngineer) {
                for (const task of tasksForItem) {
                  await coreInstance.assignAgent(task.source, agent);
                }
                try {
                  await assignedWorker.worker.runWorkById(item.slug);
                  onBacklogChange?.();
                  return `Claimed work item ${item.slug} with ${agent}. Assigned ${tasksForItem.length} task(s) and started working.`;
                } catch (err) {
                  console.error("[autopilot] Worker run failed:", err);
                  onBacklogChange?.();
                  return `Assigned item and tasks to ${agent}. Run failed: ${(err as Error).message}`;
                }
              }

              onBacklogChange?.();
              return `Assigned work item ${item.slug} to ${agent}. (Use start_working to run the worker on this item.)`;
            } catch (err) {
              return `Error: ${(err as Error).message}`;
            }
          },
        }),
      );
      tools.push(
        new DynamicTool({
          name: "start_working",
          description:
            "Trigger a worker to start working on an item or task without changing assignees. Input: JSON with \"agent\" (string, required: worker name), and either \"itemSlug\" (string) or \"taskId\" (string). Example: {\"itemSlug\": \"001-feat-x\", \"agent\": \"Camaron\"} or {\"taskId\": \"001\", \"agent\": \"Planner\"}.",
          func: async (input: string) => {
            try {
              const parsed = JSON.parse(input || "{}") as {
                itemSlug?: string;
                taskId?: string;
                agent?: string;
              };
              const agent = parsed?.agent?.trim();
              const itemSlug = parsed?.itemSlug?.trim();
              const taskId = parsed?.taskId?.trim();
              if (!agent) {
                return "Error: \"agent\" is required.";
              }
              if (!itemSlug && !taskId) {
                return "Error: Either \"itemSlug\" or \"taskId\" is required.";
              }
              if (itemSlug && taskId) {
                return "Error: Provide only one of \"itemSlug\" or \"taskId\".";
              }
              const assignedWorker = workersList.find(
                (w) => w.name === agent || w.role === agent,
              );
              if (!assignedWorker) {
                return `Error: Worker "${agent}" not found.`;
              }
              const isPlanner = assignedWorker.role?.toLowerCase() === "planner";

              if (itemSlug) {
                const state = coreInstance.getState();
                const item = state.items.find(
                  (i: { slug: string }) =>
                    i.slug === itemSlug ||
                    i.slug.startsWith(itemSlug + "-") ||
                    i.slug.split("-")[0] === itemSlug,
                );
                if (!item) {
                  return `Error: Work item "${itemSlug}" not found.`;
                }
                if (isPlanner) {
                  await assignedWorker.worker.runPlanningForItem(item.slug);
                  onBacklogChange?.();
                  return `${agent} has started planning for item ${item.slug}.`;
                }
                await assignedWorker.worker.runWorkById(item.slug);
                onBacklogChange?.();
                return `${agent} has started working on item ${item.slug}.`;
              }

              if (taskId) {
                await assignedWorker.worker.runTaskById(taskId);
                onBacklogChange?.();
                return `${agent} has started working on task ${taskId}.`;
              }

              return "Error: Missing itemSlug or taskId.";
            } catch (err) {
              return `Error: ${(err as Error).message}`;
            }
          },
        }),
      );
  }

  if (workersList.length > 0) {
    const workersSummary = workersList
      .map((w) => `${w.name} (${w.role})`)
      .join(", ");
    tools.push(
      new DynamicTool({
        name: "list_workers",
        description:
          "List available workers with their name and role. Call this when the user asks for help, what you can do, who is available, or who are the workers. You must call this to include workers in your help response.",
        func: async () =>
          `Workers: ${workersSummary}.`,
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
