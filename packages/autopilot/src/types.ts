export interface AgentTask {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: { text: string; checked: boolean }[];
  source: string;
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
