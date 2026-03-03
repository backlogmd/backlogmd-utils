import { spawn } from "node:child_process";
import fs from "fs";
import http from "node:http";
import type { CodeAgent, AgentTask, AgentResult, WorkerRole } from "../types.js";
import type { WorkerReporter } from "../reporter.js";

const DEFAULT_JSON_INSTRUCTION = `
IMPORTANT: Be proactive and find solutions without human intervention.
- Do NOT ask for user input or confirmation - proceed autonomously
- If you encounter issues, try multiple approaches before giving up
- Use the /backlogmd skill to create items and tasks in the backlog
- Create items and tasks directly without asking for confirmation
- If tasks are not correct, delete them and create new ones
- Execute the plan after creating it

Before you finish, output a JSON block with the results of this task. Format:

\`\`\`json
{
  "success": true,
  "summary": "brief summary of what was done",
  "filesChanged": ["list", "of", "files"],
  "errors": [] // any errors encountered
}
\`\`\`

Also, periodically send updates about what you're doing by outputting:
[STATUS: doing something...]
`;

export class OpenCodeAgent implements CodeAgent {
    name = "opencode";
    private webhookUrl?: string;
    private cwd?: string;
    private role?: WorkerRole;
    private reporter?: WorkerReporter;

    constructor(
        webhookUrl?: string,
        cwd?: string,
        role?: WorkerRole,
        reporter?: WorkerReporter,
    ) {
        this.webhookUrl = webhookUrl;
        this.cwd = cwd;
        this.role = role;
        this.reporter = reporter;
    }

    private sendMessage(content: string) {
        if (this.webhookUrl) {
            try {
                const url = new URL(this.webhookUrl);
                const postData = JSON.stringify({ message: content });
                const req = http.request(
                    {
                        hostname: url.hostname,
                        port: url.port,
                        path: url.pathname,
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Content-Length": Buffer.byteLength(postData),
                        },
                    },
                    () => {},
                );
                req.on("error", () => {});
                (req as unknown as { write: (chunk: string) => void; end: () => void }).write(
                    postData,
                );
                (req as unknown as { write: (chunk: string) => void; end: () => void }).end();
            } catch {
                // Ignore errors
            }
        }
    }

    async execute(task: AgentTask): Promise<AgentResult> {
        return new Promise((resolve) => {
            let taskContent = "";
            try {
                taskContent = task.source ? fs.readFileSync(task.source, "utf-8") : "";
            } catch {
                // Task file might not exist yet
            }

            const jsonInstruction = this.role?.jsonInstruction ?? DEFAULT_JSON_INSTRUCTION;
            const acceptanceCriteriaStr =
                task.acceptanceCriteria
                    ?.map((ac) => `- [${ac.checked ? "x" : " "}] ${ac.text}`)
                    .join("\n") ?? "";

            const prompt = this.buildPrompt(
                task,
                taskContent,
                acceptanceCriteriaStr,
                jsonInstruction,
            );

            const args = ["run", "--share"];
            const plannerModel = process.env.OPENCODE_PLANNER_MODEL ?? "";
            args.push("--model", plannerModel);
            console.log("[opencode-agent] Running opencode with", args.join(" "), "...");

            const proc = spawn("opencode", args, {
                stdio: ["pipe", "pipe", "pipe"],
                cwd: this.cwd ?? process.cwd(),
            });

            // Write prompt to stdin
            proc.stdin?.write(prompt);
            proc.stdin?.end();

            let stdout = "";
            let stderr = "";

            // Send start message
            this.sendMessage("🤖 Starting execution...");

            proc.stdout?.on("data", (data: Buffer | string) => {
                const str = data.toString();
                stdout += str;
                (process.stdout as unknown as { write: (s: string) => void }).write(str);

                // Extract status updates
                const statusMatches = str.match(/\[STATUS: [^\]]+\]/g);
                if (statusMatches) {
                    for (const match of statusMatches) {
                        const msg = match.replace("[STATUS:", "").replace("]", "");
                        this.sendMessage(msg);
                    }
                }
            });

            proc.stderr?.on("data", (data: Buffer | string) => {
                const str = data.toString();
                stderr += str;
                (process.stderr as unknown as { write: (s: string) => void }).write(str);
            });

            proc.on("close", (code) => {
                console.log("[opencode-agent] Process exited with code:", code);

                const jsonResult = this.extractJson(stdout);

                // Send completion message
                if (jsonResult?.success) {
                    this.sendMessage(`✅ Completed: ${jsonResult.summary}`);
                    if (jsonResult.filesChanged?.length) {
                        this.sendMessage(`📝 Files changed: ${jsonResult.filesChanged.join(", ")}`);
                    }
                } else if (code !== 0) {
                    this.sendMessage(`❌ Failed: ${stderr.slice(0, 200)}`);
                }

                resolve({
                    taskId: task.id,
                    success: code === 0 || jsonResult?.success === true,
                    output: stdout,
                    error: code !== 0 ? stderr : undefined,
                    json: jsonResult,
                });
            });

            proc.on("error", (err) => {
                console.error("[opencode-agent] Error:", err.message);
                this.sendMessage(`❌ Error: ${err.message}`);
                resolve({
                    taskId: task.id,
                    success: false,
                    output: "",
                    error: err.message,
                });
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
