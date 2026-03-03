import { AgentWorkItem } from "./types.js";

export interface AssignmentItem {
    taskId?: string;
    itemId?: string;
}

export interface GetAssignmentsResult {
    statusCode: number;
    assignments: AssignmentItem[];
}

export class BacklogHttpClient {
    private baseUrl: string;

    constructor(serverUrl: string) {
        this.baseUrl = serverUrl.replace(/\/$/, "");
    }

    getUrl(path: string): string {
        return `${this.baseUrl}${path}`;
    }

    /** GET /api/workers/assignments?name=<workerName>. Handles all server communication for fetching work. */
    async getAssignments(workerName: string): Promise<GetAssignmentsResult> {
        const url = `${this.baseUrl}/api/workers/assignments?name=${encodeURIComponent(workerName)}`;
        const res = await fetch(url);
        const body = await res.text();
        const assignments: AssignmentItem[] =
            res.status === 200 ? (JSON.parse(body) as { assignments?: AssignmentItem[] }).assignments ?? [] : [];
        return { statusCode: res.status, assignments };
    }

    async getAvailableWork(): Promise<AgentWorkItem[]> {
        const response = await fetch(this.getUrl("/work"));
        return response.json() as Promise<AgentWorkItem[]>;
    }
}
