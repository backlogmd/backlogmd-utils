import type { Manifest } from "@backlogmd/types";
import { BacklogCore } from "@backlogmd/core";
import type { CodeAgent, AgentTask, AgentResult } from "./types.js";
import { OpenCodeAgent } from "./agents/opencode.js";
import type { VCSProvider, VCSOptions } from "@backlogmd/vcs";
import path from "node:path";

export class Autopilot {
  private core: BacklogCore;
  private agent: CodeAgent;
  private vcs?: VCSProvider;
  private vcsOptions?: VCSOptions;

  constructor(core: BacklogCore, agent?: CodeAgent, vcs?: VCSProvider, vcsOptions?: VCSOptions) {
    this.core = core;
    const rootDir = core.getRootDir();
    const cwd = path.dirname(rootDir);
    this.agent = agent ?? new OpenCodeAgent(undefined, cwd);
    this.vcs = vcs;
    this.vcsOptions = vcsOptions;
  }

  async run(): Promise<void> {
    const manifest = this.core.getManifest();
    const planTasks = this.getPlanTasks(manifest);

    console.log(`[autopilot] Found ${planTasks.length} tasks in plan`);

    for (const task of planTasks) {
      const content = await this.core.getTaskContent(task.source);
      const agentTask: AgentTask = {
        ...task,
        description: content.description,
        acceptanceCriteria: content.acceptanceCriteria,
      };
      await this.executeTask(agentTask);
    }
  }

  async runPlanTask(taskId: string): Promise<void> {
    const manifest = this.core.getManifest();

    for (const item of manifest.items) {
      const task = item.tasks.find(
        (t) => (t.tid === taskId || t.t.toLowerCase() === taskId.toLowerCase()) && t.s === "plan",
      );
      if (task) {
        const source = `${item.path}/${task.file}`;
        const content = await this.core.getTaskContent(source);
        const agentTask: AgentTask = {
          id: task.tid,
          title: content.title,
          description: content.description,
          acceptanceCriteria: content.acceptanceCriteria,
          source,
        };

        await this.executeTask(agentTask);
        return;
      }
    }

    console.log(`[autopilot] Task ${taskId} not found or not in plan status`);
  }

  async runWorkById(taskId: string): Promise<void> {
    const manifest = this.core.getManifest();

    for (const item of manifest.items) {
      const task = item.tasks.find(
        (t) =>
          t.tid === taskId ||
          t.slug === taskId ||
          t.file === taskId ||
          t.t.toLowerCase() === taskId.toLowerCase(),
      );
      if (task) {
        const source = `${item.path}/${task.file}`;
        const content = await this.core.getTaskContent(source);

        const agentTask: AgentTask = {
          id: task.tid,
          title: content.title,
          description: content.description,
          acceptanceCriteria: content.acceptanceCriteria,
          source,
          executeOnly: true,
        };

        await this.executeTask(agentTask);
        return;
      }
    }

    console.error(`[autopilot] Task "${taskId}" not found`);
    process.exit(1);
  }

  async runTaskById(taskId: string): Promise<void> {
    const manifest = this.core.getManifest();

    for (const item of manifest.items) {
      const task = item.tasks.find(
        (t) =>
          t.tid === taskId ||
          t.slug === taskId ||
          t.file === taskId ||
          t.t.toLowerCase() === taskId.toLowerCase(),
      );
      if (task) {
        const source = `${item.path}/${task.file}`;
        const content = await this.core.getTaskContent(source);

        const agentTask: AgentTask = {
          id: task.tid,
          title: content.title,
          description: content.description,
          acceptanceCriteria: content.acceptanceCriteria,
          source,
        };

        await this.executeTask(agentTask);
        return;
      }
    }

    console.error(`[autopilot] Task "${taskId}" not found`);
    process.exit(1);
  }

  async executePrompt(prompt: string): Promise<void> {
    const agentTask: AgentTask = {
      id: "direct",
      title: prompt,
      description: "",
      acceptanceCriteria: [],
      source: "",
    };

    await this.executeTask(agentTask);
  }

  private getPlanTasks(manifest: Manifest) {
    return manifest.items.flatMap((item) =>
      item.tasks
        .filter((t) => t.s === "plan")
        .map((t) => ({
          id: t.tid,
          title: t.t,
          description: "",
          acceptanceCriteria: [],
          source: `${item.path}/${t.file}`,
        })),
    );
  }

  private async executeTask(task: AgentTask): Promise<void> {
    const isDirect = task.id === "direct";
    const isExecuteOnly = task.executeOnly === true;

    if (!isDirect && !isExecuteOnly) {
      console.log(`[autopilot] Executing task: ${task.title}`);
      await this.core.updateTaskStatus(task.source, "ip");
    } else if (isDirect) {
      console.log(`[autopilot] Executing prompt: ${task.title}`);
    } else {
      console.log(`[autopilot] Executing work on task: ${task.title} (status unchanged)`);
    }

    try {
      const result = await this.agent.execute(task);
      if (result.success) {
        console.log(`[autopilot] Task completed successfully`);
        if (!isDirect && !isExecuteOnly) {
          await this.core.updateTaskStatus(task.source, "done");

          if (task.acceptanceCriteria.length > 0) {
            await this.core.updateTaskContent(task.source, {
              acceptanceCriteria: task.acceptanceCriteria.map((ac) => ({
                ...ac,
                checked: true,
              })),
            });
          }
        }

        if (this.vcs && this.vcsOptions?.autoCommit) {
          await this.commitVCS(task);
        }
      } else {
        console.error(`[autopilot] Task failed:`, result.error);
        if (!isDirect && !isExecuteOnly) {
          await this.core.updateTaskStatus(task.source, "open");
        }
      }
    } catch (error) {
      console.error(`[autopilot] Task failed:`, error);
      if (!isDirect && !isExecuteOnly) {
        await this.core.updateTaskStatus(task.source, "open");
      }
    }
  }

  private async commitVCS(task: AgentTask): Promise<void> {
    if (!this.vcs) return;

    try {
      const isRepo = await this.vcs.isRepo();
      if (!isRepo) {
        console.log("[autopilot] Not a VCS repository, skipping commit");
        return;
      }

      await this.vcs.stageAll();
      const status = await this.vcs.status();

      if (
        status.staged.length === 0 &&
        status.modified.length === 0 &&
        status.untracked.length === 0
      ) {
        console.log("[autopilot] No changes to commit");
        return;
      }

      const template = this.vcsOptions?.commitMessageTemplate ?? "feat: {task}";
      const message = template
        .replace("{task}", task.title)
        .replace("{description}", task.description || "")
        .replace("{id}", task.id);

      const commitResult = await this.vcs.commit(message);

      if (commitResult.success) {
        console.log(`[autopilot] Committed: ${commitResult.commitHash?.slice(0, 7)}`);

        if (this.vcsOptions?.autoPush && this.vcs.push) {
          const pushResult = await this.vcs.push();
          if (pushResult.success) {
            console.log("[autopilot] Pushed to remote");
          } else {
            console.error(`[autopilot] Push failed: ${pushResult.error}`);
          }
        }
      } else {
        console.error(`[autopilot] Commit failed: ${commitResult.error}`);
      }
    } catch (error) {
      console.error("[autopilot] VCS error:", error);
    }
  }
}
