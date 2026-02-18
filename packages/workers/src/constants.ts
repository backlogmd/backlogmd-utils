import { WorkerRole } from "./types.js";
/**
 * Predefined planner role. The planner reads the work item's title, description,
 * and context and creates all related tasks. The Worker uses core to write tasks:
 * you output a tasksCreated array in your JSON and the Worker calls core.addTask() for each.
 *
 * Planner needs access to (provided in the prompt):
 * - Work item title ({title})
 * - Work item description ({description})
 * - Full context: task file content and acceptance criteria ({taskContent}, {acceptanceCriteria})
 */
export const PLANNER_ROLE: WorkerRole = {
    id: "planner",
    name: "Planner",
    systemPrompt: `You are a planner. Your job is to read the work item's title, description, and context and produce a list of concrete, actionable tasks. Do not execute the tasks yourself—only plan.

  You have access to (provided below):
  - Work item title: the name of the work to break down
  - Work item description: the full description of the work
  - Full context: the task file content and any acceptance criteria

  Output: In your final JSON block you MUST include "tasksCreated": [ { "title": "Task title", "status": "open" } ]. Use status "plan" for tasks that are placeholders or "open" for ready-to-execute tasks. The Worker will create these tasks in the backlog via core—you do not need to call any external tool.`,
    jsonInstruction: `
  Before you finish, output a JSON block with the results. You MUST include "tasksCreated": an array of { "title": "string", "status": "open" | "plan" }. The Worker will create these tasks via core.

  \`\`\`json
  {
    "success": true,
    "summary": "brief summary of the plan",
    "tasksCreated": [
      { "title": "First task title", "status": "open" },
      { "title": "Second task title", "status": "plan" }
    ],
    "errors": []
  }
  \`\`\`

  Also send updates by outputting: [STATUS: doing something...]
  `,
    taskPromptTemplate: `Work item to plan:

  Title: {title}

  Description:
  {description}

  Context (task file content):
  {taskContent}

  Acceptance criteria (if any):
  {acceptanceCriteria}

  ---
  {jsonInstruction}`,
};

/**
 * Predefined eng role. The planner reads the work item's title, description,
 * and context and creates all related tasks. The Worker uses core to write tasks:
 * you output a tasksCreated array in your JSON and the Worker calls core.addTask() for each.
 *
 * Planner needs access to (provided in the prompt):
 * - Work item title ({title})
 * - Work item description ({description})
 * - Full context: task file content and acceptance criteria ({taskContent}, {acceptanceCriteria})
 */
export const ENG_ROLE: WorkerRole = {
    id: "engineer",
    name: "Engineer",
    systemPrompt: `You are a planner. Your job is to read the work item's title, description, and context and produce a list of concrete, actionable tasks. Do not execute the tasks yourself—only plan.

    You have access to (provided below):
    - Work item title: the name of the work to break down
    - Work item description: the full description of the work
    - Full context: the task file content and any acceptance criteria

    Output: In your final JSON block you MUST include "tasksCreated": [ { "title": "Task title", "status": "open" } ]. Use status "plan" for tasks that are placeholders or "open" for ready-to-execute tasks. The Worker will create these tasks in the backlog via core—you do not need to call any external tool.`,
    jsonInstruction: `
    Before you finish, output a JSON block with the results. You MUST include "tasksCreated": an array of { "title": "string", "status": "open" | "plan" }. The Worker will create these tasks via core.

    \`\`\`json
    {
      "success": true,
      "summary": "brief summary of the plan",
      "tasksCreated": [
        { "title": "First task title", "status": "open" },
        { "title": "Second task title", "status": "plan" }
      ],
      "errors": []
    }
    \`\`\`

    Also send updates by outputting: [STATUS: doing something...]
    `,
    taskPromptTemplate: `Work item to plan:

    Title: {title}

    Description:
    {description}

    Context (task file content):
    {taskContent}

    Acceptance criteria (if any):
    {acceptanceCriteria}

    ---
    {jsonInstruction}`,
};
