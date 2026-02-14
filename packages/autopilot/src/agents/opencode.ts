import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import type { CodeAgent, AgentTask, AgentResult } from "../types.js";

const JSON_INSTRUCTION = `
IMPORTANT: Use the /backlogmd skill to create items and tasks in the backlog.
- Create items and tasks directly WITHOUT asking for confirmation
- NEVER ask questions like "Would you like me to create this item?" - just create it
- If tasks are not correct, delete them and create new ones
- Execute the plan after creating it
- Do not ask for user input - proceed autonomously

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

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl;
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
        req.write(postData);
        req.end();
      } catch {
        // Ignore errors
      }
    }
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    return new Promise((resolve) => {
      let taskContent = "";
      try {
        taskContent = fs.readFileSync(task.source, "utf-8");
      } catch {
        // Task file might not exist yet
      }

      const prompt = `Task: ${task.title}

${taskContent}

${JSON_INSTRUCTION}`;

      console.log("[opencode-agent] Running opencode with --share...");

      // Use --share to auto-confirm actions
      const proc = spawn("opencode", ["run", "--share"], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: process.cwd(),
      });

      // Write prompt to stdin
      proc.stdin?.write(prompt);
      proc.stdin?.end();

      let stdout = "";
      let stderr = "";

      // Send start message
      this.sendMessage("🤖 Starting execution...");

      proc.stdout?.on("data", (data) => {
        const str = data.toString();
        stdout += str;
        process.stdout.write(str);

        // Extract status updates
        const statusMatches = str.match(/\[STATUS: [^\]]+\]/g);
        if (statusMatches) {
          for (const match of statusMatches) {
            const msg = match.replace("[STATUS:", "").replace("]", "");
            this.sendMessage(msg);
          }
        }
      });

      proc.stderr?.on("data", (data) => {
        const str = data.toString();
        stderr += str;
        process.stderr.write(str);
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
