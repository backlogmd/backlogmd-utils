import { buildBacklogOutput } from "@backlogmd/parser";
import { createChatAgent } from "@backlogmd/autopilot";
import { BacklogCore } from "@backlogmd/core";
import { Worker, PLANNER_ROLE } from "@backlogmd/workers";
import type { WorkerRole } from "@backlogmd/workers";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicTool } from "langchain/tools";
import type { AgentExecutor } from "langchain/agents";

const STAFF_ENGINEER_ROLE: WorkerRole = {
  id: "staff-engineer",
};

export interface CreateChatAgentForServerOptions {
  onBacklogChange?: () => void;
}

export async function createChatAgentForServer(
  backlogDir: string,
  options: CreateChatAgentForServerOptions = {},
): Promise<AgentExecutor | null> {
  const { onBacklogChange } = options;
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

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

  let workersList: { worker: Worker; name: string; role: string }[] = [];
  let core: Awaited<ReturnType<typeof BacklogCore.load>> | null = null;
  try {
    core = await BacklogCore.load({ rootDir: backlogDir });
    workersList = [
      {
        worker: new Worker(core, undefined, undefined, undefined, STAFF_ENGINEER_ROLE),
        name: "Camaron",
        role: "staff-engineer",
      },
      {
        worker: new Worker(core, undefined, undefined, undefined, STAFF_ENGINEER_ROLE),
        name: "Pastora",
        role: "staff-engineer",
      },
      {
        worker: new Worker(core, undefined, undefined, undefined, PLANNER_ROLE),
        name: "Planner",
        role: "planner",
      },
    ];
  } catch (err) {
    console.warn(
      "[backlogmd-serve] Could not load core for workers:",
      (err as Error).message,
      "- chat will have no list_workers.",
    );
  }

  try {
    const executor = await createChatAgent({
      llm: new ChatOpenAI({ temperature: 0 }),
      core: core ?? undefined,
      workers: workersList.length > 0 ? workersList : undefined,
      tools: [getBacklog],
      onBacklogChange,
    });
    console.log("[backlogmd-serve] Chat agent ready.");
    return executor;
  } catch (err) {
    console.error(
      "[backlogmd-serve] Failed to create chat agent:",
      (err as Error).message,
    );
    return null;
  }
}
