import type { AgentExecutor } from "langchain/agents";
import type { ServerResponse } from "node:http";

export interface AppContext {
  backlogDir: string;
  getChatAgent: () => Promise<AgentExecutor | null>;
  notifyClients: () => void;
  addEventClient: (res: ServerResponse) => void;
  removeEventClient: (res: ServerResponse) => void;
}
