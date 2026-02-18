import type { CodeAgent, AgentTask, AgentResult, WorkerRole } from "../types.js";
import { ENG_ROLE } from "./../constants.js";

export class SmokeAgent implements CodeAgent {
    name = "smoke";
    private workDir?: string;
    private role?: WorkerRole;

    constructor(workDir?: string, role?: WorkerRole) {
        this.workDir = workDir;
        this.role = role || ENG_ROLE;
    }

    async execute(task: AgentTask): Promise<AgentResult> {
        return new Promise((resolve) => {
            const jsonInstruction = this.role?.jsonInstruction ?? "";
            const acceptanceCriteriaStr =
                task.acceptanceCriteria
                    ?.map((ac) => `- [${ac.checked ? "x" : " "}] ${ac.text}`)
                    .join("\n") ?? "";

            const prompt = this.buildPrompt(
                task,
                "es un monton",
                acceptanceCriteriaStr,
                jsonInstruction,
            );

            const args = ["run", "--share"];
            const plannerModel = process.env.OPENCODE_PLANNER_MODEL ?? "";
            args.push("--model", plannerModel);
            console.log("[smoke-agent] Running opencode with", args.join(" "), "...");
            console.log("[smoke-agent] Prompt", prompt);

            resolve({
                taskId: task.id,
                success: true,
                output: "",
                error: undefined,
                json: undefined,
            });
        });
    }

    private buildPrompt(
        task: AgentTask,
        taskContent: string,
        acceptanceCriteriaStr: string,
        jsonInstruction: string,
    ): string {
        const r = this.role;
        const defaultBody = `Task: ${task.title}

${taskContent}

${jsonInstruction}`;
        const body = r?.taskPromptTemplate
            ? r.taskPromptTemplate
                  .replace("{title}", task.title)
                  .replace("{description}", task.description ?? "")
                  .replace("{taskContent}", taskContent)
                  .replace("{acceptanceCriteria}", acceptanceCriteriaStr)
                  .replace("{jsonInstruction}", jsonInstruction)
            : defaultBody;
        const system = r?.systemPrompt?.trim();
        return system ? `${system}\n\n---\n\n${body}` : body;
    }

    private extractJson(
        output: string,
    ): { success: boolean; summary: string; filesChanged: string[]; errors: string[] } | undefined {
        const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[1]);
            } catch {
                return undefined;
            }
        }
        return undefined;
    }
}
