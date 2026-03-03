// import { buildBacklogOutput } from "@backlogmd/parser";
// //import { createChatAgent } from "@backlogmd/autopilot";
// import { BacklogCore } from "@backlogmd/core";
// import { DynamicTool } from "@langchain/core/tools";
// import { ChatOpenAI } from "@langchain/openai";
// import type { AgentExecutor } from "@langchain/classic/agents";
// import type { WorkerState } from "./workerRegistry.js";

// export interface CreateChatAgentForServerOptions {
//   onBacklogChange?: () => void;
//   /** Workers that have reported to the server (in-memory list). Used for list_workers tool. */
//   getWorkerStates?: () => WorkerState[];
// }

// export async function createChatAgentForServer(
//   backlogDir: string,
//   options: CreateChatAgentForServerOptions = {},
// ): Promise<AgentExecutor | null> {
//   const { onBacklogChange, getWorkerStates } = options;
//   if (!process.env.OPENAI_API_KEY) {
//     return null;
//   }

//   const getBacklog = new DynamicTool({
//     name: "get_backlog",
//     description:
//       "Get the current backlog (work items and tasks). Use this to answer questions about what is on the backlog.",
//     func: async () => {
//       const output = buildBacklogOutput(backlogDir);
//       return JSON.stringify(
//         {
//           entries: output.entries?.length ?? 0,
//           items: output.items?.length ?? 0,
//           tasks: output.tasks?.length ?? 0,
//           validationErrors: output.validation?.errors?.length ?? 0,
//           summary: output.entries?.slice(0, 20) ?? [],
//         },
//         null,
//         2,
//       );
//     },
//   });

//   const tools: InstanceType<typeof DynamicTool>[] = [getBacklog];

//   if (getWorkerStates) {
//     tools.push(
//       new DynamicTool({
//         name: "list_workers",
//         description:
//           "List workers that have reported to the server (name, role, status). Call this when the user asks for help, who is available, or what workers exist.",
//         func: async () => {
//           const workers = getWorkerStates();
//           if (workers.length === 0) {
//             return "No workers have reported yet. Workers register when they run with --server-url pointing to this server.";
//           }
//           return workers
//             .map(
//               (w) => `${w.name} (${w.role}): ${w.status}${w.taskTitle ? ` — ${w.taskTitle}` : ""}`,
//             )
//             .join("\n");
//         },
//       }),
//     );
//   }

//   let core: Awaited<ReturnType<typeof BacklogCore.load>> | null = null;
//   try {
//     core = await BacklogCore.load({ rootDir: backlogDir });
//   } catch (err) {
//     console.warn(
//       "[backlogmd-serve] Could not load core:",
//       (err as Error).message,
//       "- chat will have no backlog mutation tools.",
//     );
//   }

// try {
//   const executor = await createChatAgent({
//     llm: new ChatOpenAI({ temperature: 0 }),
//     core: core ?? undefined,
//     tools,
//     onBacklogChange,
//   });
//   console.log("[backlogmd-serve] Chat agent ready.");
//   return executor;
// } catch (err) {
//   console.error(
//     "[backlogmd-serve] Failed to create chat agent:",
//     (err as Error).message,
//   );
//   return null;
// }
//}
