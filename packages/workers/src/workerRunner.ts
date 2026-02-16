import type { BacklogOutput, Task } from "@backlogmd/types";
import { BacklogCore } from "@backlogmd/core";
import type { CodeAgent, AgentTask } from "./types.js";
import { OpenCodeAgent } from "./agents/opencode.js";
import type { VCSProvider, VCSOptions } from "@backlogmd/vcs";
import path from "node:path";

export class Worker {
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
    const state = this.core.getState();
    const planTasks = this.getPlanTasks(state);

    console.log(`[worker] Found ${planTasks.length} tasks in plan`);

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
    const state = this.core.getState();
    const task = state.tasks.find(
      (t) =>
        (t.slug.split("-")[0] === taskId || t.slug === taskId) && t.status === "plan",
    );
    if (task) {
      const content = await this.core.getTaskContent(task.source);
      const agentTask: AgentTask = {
        id: task.slug.split("-")[0],
        title: content.title,
        description: content.description,
        acceptanceCriteria: content.acceptanceCriteria,
        source: task.source,
      };
      await this.executeTask(agentTask);
      return;
    }
    console.log(`[worker] Task ${taskId} not found or not in plan status`);
  }

  async runWorkById(workIdentifier: string): Promise<void> {
    const state = this.core.getState();
    const item = state.items.find(
      (i) =>
        i.slug.split("-")[0] === workIdentifier ||
        i.slug === workIdentifier ||
        i.slug.toLowerCase() === workIdentifier.toLowerCase(),
    );

    if (!item) {
      console.error(`[worker] Work "${workIdentifier}" not found`);
      return;
    }

    console.log(`[worker] Executing work: ${item.slug}`);

    const tasksForItem = state.tasks.filter((t) => t.itemSlug === item.slug);
    for (const task of tasksForItem) {
      const content = await this.core.getTaskContent(task.source);
      const basename = path.basename(task.source, ".md");
      const id = basename.match(/^(\d+)-/)?.[1] ?? task.slug;
      const agentTask: AgentTask = {
        id,
        title: content.title,
        description: content.description,
        acceptanceCriteria: content.acceptanceCriteria,
        source: task.source,
        executeOnly: true,
      };
      await this.executeTask(agentTask);
    }
  }

  async runTaskById(taskId: string): Promise<void> {
    const state = this.core.getState();
    const task = state.tasks.find((t) => {
      const basename = path.basename(t.source, ".md");
      const tid = basename.match(/^(\d+)-/)?.[1];
      return (
        tid === taskId ||
        t.slug === taskId ||
        t.source === taskId ||
        t.name.toLowerCase() === taskId.toLowerCase()
      );
    });
    if (task) {
      const content = await this.core.getTaskContent(task.source);
      const basename = path.basename(task.source, ".md");
      const id = basename.match(/^(\d+)-/)?.[1] ?? task.slug;
      const agentTask: AgentTask = {
        id,
        title: content.title,
        description: content.description,
        acceptanceCriteria: content.acceptanceCriteria,
        source: task.source,
      };
      await this.executeTask(agentTask);
      return;
    }
    throw new Error(`Task "${taskId}" not found`);
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

  private getPlanTasks(state: BacklogOutput): AgentTask[] {
    return state.tasks
      .filter((t) => t.status === "plan")
      .map((t) => {
        const basename = path.basename(t.source, ".md");
        const id = basename.match(/^(\d+)-/)?.[1] ?? t.slug;
        return {
          id,
          title: t.name,
          description: "",
          acceptanceCriteria: [],
          source: t.source,
        };
      });
  }

  private async executeTask(task: AgentTask): Promise<void> {
    const isDirect = task.id === "direct";
    const isExecuteOnly = task.executeOnly === true;

    if (!isDirect && !isExecuteOnly) {
      console.log(`[worker] Executing task: ${task.title}`);
      await this.core.updateTaskStatus(task.source, "in-progress");
    } else if (isDirect) {
      console.log(`[worker] Executing prompt: ${task.title}`);
    } else {
      console.log(`[worker] Executing work on task: ${task.title} (status unchanged)`);
    }

    try {
      const result = await this.agent.execute(task);
      if (result.success) {
        console.log(`[worker] Task completed successfully`);
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
        console.error(`[worker] Task failed:`, result.error);
        if (!isDirect && !isExecuteOnly) {
          await this.core.updateTaskStatus(task.source, "open");
        }
      }
    } catch (error) {
      console.error(`[worker] Task failed:`, error);
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
        console.log("[worker] Not a VCS repository, skipping commit");
        return;
      }

      await this.vcs.stageAll();
      const status = await this.vcs.status();

      if (
        status.staged.length === 0 &&
        status.modified.length === 0 &&
        status.untracked.length === 0
      ) {
        console.log("[worker] No changes to commit");
        return;
      }

      const template = this.vcsOptions?.commitMessageTemplate ?? "feat: {task}";
      const message = template
        .replace("{task}", task.title)
        .replace("{description}", task.description || "")
        .replace("{id}", task.id);

      const commitResult = await this.vcs.commit(message);

      if (commitResult.success) {
        console.log(`[worker] Committed: ${commitResult.commitHash?.slice(0, 7)}`);

        if (this.vcsOptions?.autoPush && this.vcs.push) {
          const pushResult = await this.vcs.push();
          if (pushResult.success) {
            console.log("[worker] Pushed to remote");
          } else {
            console.error(`[worker] Push failed: ${pushResult.error}`);
          }
        }
      } else {
        console.error(`[worker] Commit failed: ${commitResult.error}`);
      }
    } catch (error) {
      console.error("[worker] VCS error:", error);
    }
  }
}
