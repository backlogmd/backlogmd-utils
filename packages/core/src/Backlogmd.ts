import fs from "node:fs";
import path from "node:path";
import type { BacklogOutput, BacklogmdDocument, BacklogStateDto, TaskStatus, WorkItem, WorkItemDto } from "@backlogmd/types";
import { buildBacklogOutput } from "@backlogmd/parser";
import { fromBacklogToDtos } from "./mappers/WorkItemsMapper.js";
import {
    BacklogDocument,
    createWorkItem,
    createTask,
    removeWorkItem,
    removeTaskFile,
} from "@backlogmd/writer";
import { OperationQueue } from "./queue.js";
import type { BacklogmdOptions, TaskAddInput, ItemAddInput, TaskContent } from "./types.js";

export class Backlogmd {
    private rootDir: string;
    private state: BacklogOutput;
    private queue: OperationQueue;

    private constructor(rootDir: string, state: BacklogOutput) {
        this.rootDir = rootDir;
        this.state = state;
        this.queue = new OperationQueue();
    }

    static async load(options: BacklogmdOptions): Promise<Backlogmd> {
        const absRoot = path.resolve(options.rootDir);
        const state = buildBacklogOutput(absRoot);
        return new Backlogmd(absRoot, state);
    }

    getRootDir(): string {
        return this.rootDir;
    }

    /** Current backlog as DTO (source of truth for server/API). Re-parsed after each mutation and on reconcile(). */
    getDocument(): BacklogStateDto {
        const work: WorkItem[] = this.state.items.map((i) => ({
            slug: i.slug,
            name: i.work,
            type: i.type,
            tasks: i.tasks,
            source: i.source,
            assignee: i.assignee,
        }));
        const workDir = this.rootDir.endsWith(".backlogmd")
            ? path.dirname(this.rootDir)
            : this.rootDir;
        const doc: BacklogmdDocument = {
            protocol: this.state.protocol,
            generatedAt: this.state.generatedAt,
            rootDir: this.state.rootDir,
            work,
            tasks: this.state.tasks,
            workDir,
            validation: this.state.validation,
        };
        return {
            protocol: this.state.protocol,
            generatedAt: this.state.generatedAt,
            rootDir: this.state.rootDir,
            validation: this.state.validation,
            work: fromBacklogToDtos(doc),
        };
    }

    /** Open work items only (status === "open"). */
    getPendingWork(): WorkItemDto[] {
        return this.getDocument().work.filter((item) => item.status === "open");
    }

    /** Re-read the backlog from disk (e.g. after switching branch). */
    refresh(): void {
        this.state = buildBacklogOutput(this.rootDir);
    }

    private async refreshState(): Promise<BacklogStateDto> {
        this.state = buildBacklogOutput(this.rootDir);
        return this.getDocument();
    }

    async closeTask(taskId: string): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            const doc = await BacklogDocument.load(this.rootDir);
            const changeset = doc.changeTaskStatus(taskId, "done");
            await doc.commit(changeset);
            return this.refreshState();
        });
    }

    async startTask(taskId: string): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            const doc = await BacklogDocument.load(this.rootDir);
            const task = doc.model.tasks.find(
                (t) => t.source === taskId || `${t.itemSlug}/${t.priority}` === taskId,
            );
            if (!task) throw new Error(`Task "${taskId}" not found`);
            const status: TaskStatus = task.requiresHumanReview ? "review" : "in-progress";
            const changeset = doc.changeTaskStatus(taskId, status);
            await doc.commit(changeset);
            return this.refreshState();
        });
    }

    async updateTaskStatus(taskId: string, status: TaskStatus): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            const doc = await BacklogDocument.load(this.rootDir);
            const changeset = doc.changeTaskStatus(taskId, status);
            await doc.commit(changeset);
            return this.refreshState();
        });
    }

    async addTask(itemSlug: string, input: TaskAddInput): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            createTask(this.rootDir, itemSlug, input.title, {
                status: input.status === "plan" ? "plan" : "open",
                tid: input.tid,
            });
            return this.refreshState();
        });
    }

    async removeTask(taskId: string): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            removeTaskFile(this.rootDir, taskId);
            return this.refreshState();
        });
    }

    async getTaskContent(taskId: string): Promise<TaskContent> {
        const task = this.state.tasks.find(
            (t) =>
                t.source === taskId ||
                t.slug === taskId ||
                `${t.itemSlug}/${t.priority}` === taskId ||
                `${t.itemSlug}/${t.slug.split("-")[0]}` === taskId,
        );
        if (!task) throw new Error(`Task "${taskId}" not found`);
        return {
            title: task.name,
            description: task.description,
            acceptanceCriteria: task.acceptanceCriteria,
        };
    }

    /** Get the full file content of a task (METADATA + DESCRIPTION + ACCEPTANCE CRITERIA). */
    async getTaskFileContent(taskSource: string): Promise<{ content: string }> {
        const task = this.state.tasks.find(
            (t) => t.source === taskSource || t.source === taskSource.replace(/\.md$/, ""),
        );
        if (!task) throw new Error(`Task "${taskSource}" not found`);
        const absPath = path.join(this.rootDir, task.source ?? taskSource);
        const content = fs.readFileSync(absPath, "utf-8");
        return { content };
    }

    /** Overwrite the task file (full content); then re-parses and returns fresh state. */
    async updateTaskFileContent(taskSource: string, content: string): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            const task = this.state.tasks.find(
                (t) => t.source === taskSource || t.source === taskSource.replace(/\.md$/, ""),
            );
            if (!task?.source) throw new Error(`Task "${taskSource}" not found`);
            const absPath = path.join(this.rootDir, task.source);
            fs.writeFileSync(absPath, content, "utf-8");
            return this.refreshState();
        });
    }

    async updateTaskContent(
        taskId: string,
        _updates: Partial<TaskContent>,
    ): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            return this.refreshState();
        });
    }

    async assignAgent(taskId: string, agentId: string): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            const doc = await BacklogDocument.load(this.rootDir);
            const changeset = doc.changeTaskAssignee(taskId, agentId);
            await doc.commit(changeset);
            return this.refreshState();
        });
    }

    async addItem(input: ItemAddInput): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            createWorkItem(this.rootDir, input.title, input.type, {
                description: input.description,
                context: input.context,
            });
            return this.refreshState();
        });
    }

    async removeItem(itemSlug: string): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            removeWorkItem(this.rootDir, itemSlug);
            return this.refreshState();
        });
    }

    /** Get the full content of a work item index (METADATA YAML + DESCRIPTION + CONTEXT). */
    async getItemContent(itemSlug: string): Promise<{ content: string }> {
        const item = this.state.items.find((i) => i.slug === itemSlug);
        if (!item) throw new Error(`Item "${itemSlug}" not found`);
        const absPath = path.join(this.rootDir, item.source);
        const content = fs.readFileSync(absPath, "utf-8");
        return { content };
    }

    /** Overwrite the work item index.md (full file: METADATA YAML + body); then re-parses and returns fresh state. */
    async updateItemContent(itemSlug: string, content: string): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            const item = this.state.items.find((i) => i.slug === itemSlug);
            if (!item) throw new Error(`Item "${itemSlug}" not found`);
            const absPath = path.join(this.rootDir, item.source);
            fs.writeFileSync(absPath, content, "utf-8");
            return this.refreshState();
        });
    }

    /** Assign a work item to an agent (sets assignee in the item index). */
    async assignItem(itemSlug: string, agentId: string): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            const doc = await BacklogDocument.load(this.rootDir);
            const changeset = doc.changeItemAssignee(itemSlug, agentId);
            await doc.commit(changeset);
            return this.refreshState();
        });
    }

    async archiveItem(itemSlug: string): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            // Writer does not yet expose archive; for now same as remove or extend writer later
            removeWorkItem(this.rootDir, itemSlug);
            return this.refreshState();
        });
    }

    async updateItemStatus(
        _itemSlug: string,
        _status: "open" | "archived",
    ): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            // Writer does not yet expose patch item index status; extend writer later
            return this.refreshState();
        });
    }

    async resetItemTasks(itemSlug: string): Promise<BacklogStateDto> {
        return this.queue.enqueue(async () => {
            const doc = await BacklogDocument.load(this.rootDir);
            const tasksToReset = doc.model.tasks.filter(
                (t) => t.itemSlug === itemSlug && t.status !== "done",
            );
            for (const task of tasksToReset) {
                const cs = doc.changeTaskStatus(task.source, "open");
                await doc.commit(cs);
            }
            return this.refreshState();
        });
    }

    async reconcile(): Promise<void> {
        await this.queue.enqueue(async () => {
            this.state = buildBacklogOutput(this.rootDir);
        });
    }
}
