/**
 * Role for a worker. Roles have different prompts so the same agent can behave
 * differently (e.g. planner vs executor).
 */
export interface WorkerRole {
    /** Unique id (e.g. "planner", "executor") */
    id: string;
    /** Display name (e.g. "Billy") */
    name?: string;
    /** Optional system-level instructions prepended to every task prompt */
    systemPrompt?: string;
    /**
     * Optional task prompt template. Placeholders: {title}, {description}, {taskContent}, {acceptanceCriteria}, {jsonInstruction}.
     * If omitted, the agent uses its default task prompt format.
     */
    taskPromptTemplate?: string;
    /**
     * Optional JSON output instruction (replaces the agent default). Use for roles like planner
     * that require a specific JSON shape (e.g. tasksCreated).
     */
    jsonInstruction?: string;
}

export interface AgentTask {
    id: string;
    title: string;
    description: string;
    acceptanceCriteria: { text: string; checked: boolean }[];
    feedback?: string[];
    /** Source file path (for updateTaskStatus, etc.). */
    source?: string;
    itemSlug?: string;
    /** When true, planner runs without changing task status. */
    executeOnly?: boolean;
}

export interface AgentWorkItem {
    id: string;
    title: string;
    tasks: AgentTask[];
}

export interface AgentResult {
    taskId: string;
    success: boolean;
    output: string;
    error?: string;
    json?: {
        success: boolean;
        summary: string;
        filesChanged: string[];
        errors: string[];
    };
}

export interface CodeAgent {
    name: string;
    execute(task: AgentTask): Promise<AgentResult>;
}
