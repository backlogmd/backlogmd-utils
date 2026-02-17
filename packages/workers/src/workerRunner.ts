import type { BacklogOutput, Task, TaskStatus } from "@backlogmd/types";
import { BacklogCore } from "@backlogmd/core";
import type { CodeAgent, AgentTask, WorkerRole } from "./types.js";
import type { WorkerReporter } from "./reporter.js";
import { OpenCodeAgent } from "./agents/opencode.js";
import type { VCSProvider, VCSOptions } from "@backlogmd/vcs";
/// <reference types="node" />
import fs from "fs/promises";
import path from "path";

export class Worker {
  private core: BacklogCore;
  private agent: CodeAgent;
  private vcs?: VCSProvider;
  private vcsOptions?: VCSOptions;
  private reporter?: WorkerReporter;
  private role?: WorkerRole;

  constructor(
    core: BacklogCore,
    agent?: CodeAgent,
    vcs?: VCSProvider,
    vcsOptions?: VCSOptions,
    reporter?: WorkerReporter,
    role?: WorkerRole,
  ) {
    this.core = core;
    const rootDir = core.getRootDir();
    const cwd = path.dirname(rootDir);
    this.role = role;
    this.reporter = reporter;
    this.agent = agent ?? new OpenCodeAgent(undefined, cwd, role, reporter);
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
        (t.slug.split("-")[0] === taskId || t.slug === taskId) &&
        (t.status as string) === "plan",
    );
    if (task) {
      const content = await this.core.getTaskContent(task.source);
      const agentTask: AgentTask = {
        id: task.slug.split("-")[0],
        title: content.title,
        description: content.description,
        acceptanceCriteria: content.acceptanceCriteria,
        source: task.source,
        itemSlug: task.itemSlug,
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
        itemSlug: item.slug,
        executeOnly: false,
      };
      await this.executeTask(agentTask);
    }
  }

  /**
   * Run the planner on a work item (no task files yet). Loads the item index,
   * builds a synthetic plan task, and runs the agent; planner output tasksCreated
   * are created via core.addTask.
   */
  async runPlanningForItem(itemSlug: string): Promise<void> {
    if (this.role?.id !== "planner") {
      console.log(`[worker] runPlanningForItem ignored: role is ${this.role?.id ?? "none"}, not planner`);
      return;
    }

    const state = this.core.getState();
    const item = state.items.find(
      (i) =>
        i.slug === itemSlug ||
        i.slug.startsWith(itemSlug + "-") ||
        i.slug.split("-")[0] === itemSlug,
    );
    if (!item) {
      console.error(`[worker] Work item "${itemSlug}" not found`);
      return;
    }

    const indexPath = path.join(this.core.getRootDir(), item.source);
    let rawContent: string;
    try {
      rawContent = await fs.readFile(indexPath, "utf-8");
    } catch (err) {
      console.error(`[worker] Failed to read item index ${indexPath}:`, (err as Error).message);
      return;
    }

    const { title, description } = this.parseItemIndexContent(rawContent);
    const agentTask: AgentTask = {
      id: "plan",
      title: title || item.slug,
      description: description || "",
      acceptanceCriteria: [],
      source: indexPath,
      itemSlug: item.slug,
      executeOnly: true,
    };

    console.log(`[worker] Running planner on work item: ${item.slug}`);
    await this.executeTask(agentTask);
    this.core.refresh();
    const stateAfter = this.core.getState();
    const planTasks = stateAfter.tasks.filter(
      (t) => (t.itemSlug === item.slug || t.itemSlug === itemSlug) && t.status === "plan",
    );
    for (const t of planTasks) {
      await this.core.updateTaskStatus(t.source, "open");
      console.log(`[worker] Moved task to open: ${t.name}`);
    }
  }

  private parseItemIndexContent(content: string): { title: string; description: string } {
    const metadataSection = this.extractSection(content, "METADATA");
    const codeMatch = metadataSection.match(/```[\s\S]*?\n([\s\S]*?)```/);
    let title = "";
    if (codeMatch) {
      for (const line of codeMatch[1].split("\n")) {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) continue;
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        if (key === "work" && value) {
          const v = value.trim();
          title = (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")) ? v.slice(1, -1) : v;
          break;
        }
      }
    }
    const description = this.extractSection(content, "DESCRIPTION");
    return { title, description };
  }

  private extractSection(content: string, sectionName: string): string {
    const startTag = `<!-- ${sectionName} -->`;
    const startIndex = content.indexOf(startTag);
    if (startIndex === -1) return "";
    const from = startIndex + startTag.length;
    const nextComment = content.indexOf("<!--", from);
    const endIndex = nextComment === -1 ? content.length : nextComment;
    return content.slice(from, endIndex).trim();
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
        itemSlug: task.itemSlug,
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
      .filter((t) => (t.status as string) === "plan")
      .map((t) => {
        const basename = path.basename(t.source, ".md");
        const id = basename.match(/^(\d+)-/)?.[1] ?? t.slug;
        return {
          id,
          title: t.name,
          description: "",
          acceptanceCriteria: [],
          source: t.source,
          itemSlug: t.itemSlug,
        };
      });
  }

  private async executeTask(task: AgentTask): Promise<void> {
    const isDirect = task.id === "direct";
    const isExecuteOnly = task.executeOnly === true;

    this.reporter?.reportStatus({
      status: "running",
      taskId: task.id,
      taskTitle: task.title,
    });

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

        if (this.role?.id === "planner" && task.itemSlug && result.json) {
          const tasksCreated = (result.json as { tasksCreated?: { title: string; status?: string }[] }).tasksCreated;
          if (Array.isArray(tasksCreated) && tasksCreated.length > 0) {
            for (const t of tasksCreated) {
              const title = t?.title?.trim();
              if (!title) continue;
              await this.core.addTask(task.itemSlug, { title, status: "plan" });
              console.log(`[worker] Created task: ${title} (plan)`);
            }
          }
        }

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
    } finally {
      this.reporter?.reportStatus({ status: "idle" });
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
