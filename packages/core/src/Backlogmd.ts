import path from "node:path";
import type { BacklogOutput, BacklogmdDocument, TaskStatus, WorkItemDto } from "@backlogmd/types";
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

    /** Current backlog state (from parser). Re-parsed after each mutation. */
    getState(): BacklogOutput {
        return this.state;
    }

    getRootDir(): string {
        return this.rootDir;
    }

    getPendingWork(): WorkItemDto[] {
        const doc: BacklogmdDocument = {
            protocol: this.state.protocol,
            generatedAt: this.state.generatedAt,
            rootDir: this.state.rootDir,
            work: this.state.items,
            tasks: this.state.tasks,
            validation: this.state.validation,
        };
        return fromBacklogToDtos(doc).filter((item) => item.status === "open");
    }

    /** Re-read the backlog from disk (e.g. after switching branch). */
    refresh(): void {
        this.state = buildBacklogOutput(this.rootDir);
    }

    private async refreshState(): Promise<BacklogOutput> {
        this.state = buildBacklogOutput(this.rootDir);
        return this.state;
    }

    async closeTask(taskId: string): Promise<BacklogOutput> {
        return this.queue.enqueue(async () => {
            const doc = await BacklogDocument.load(this.rootDir);
            const changeset = doc.changeTaskStatus(taskId, "done");
            await doc.commit(changeset);
            return this.refreshState();
        });
    }

    async startTask(taskId: string): Promise<BacklogOutput> {
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

    async updateTaskStatus(taskId: string, status: TaskStatus): Promise<BacklogOutput> {
        return this.queue.enqueue(async () => {
            const doc = await BacklogDocument.load(this.rootDir);
            const changeset = doc.changeTaskStatus(taskId, status);
            await doc.commit(changeset);
            return this.refreshState();
        });
    }

    async addTask(itemSlug: string, input: TaskAddInput): Promise<BacklogOutput> {
        return this.queue.enqueue(async () => {
            createTask(this.rootDir, itemSlug, input.title, {
                status: input.status === "plan" ? "plan" : "open",
                tid: input.tid,
            });
            return this.refreshState();
        });
    }

    async removeTask(taskId: string): Promise<BacklogOutput> {
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

    async updateTaskContent(
        taskId: string,
        _updates: Partial<TaskContent>,
    ): Promise<BacklogOutput> {
        return this.queue.enqueue(async () => {
            // Writer does not yet expose patch description/acceptance; re-parse after no-op or extend writer later
            return this.refreshState();
        });
    }

    async assignAgent(taskId: string, agentId: string): Promise<BacklogOutput> {
        return this.queue.enqueue(async () => {
            const doc = await BacklogDocument.load(this.rootDir);
            const changeset = doc.changeTaskAssignee(taskId, agentId);
            await doc.commit(changeset);
            return this.refreshState();
        });
    }

    async addItem(input: ItemAddInput): Promise<BacklogOutput> {
        return this.queue.enqueue(async () => {
            createWorkItem(this.rootDir, input.title, input.type, {
                description: input.description,
                context: input.context,
            });
            return this.refreshState();
        });
    }

    async removeItem(itemSlug: string): Promise<BacklogOutput> {
        return this.queue.enqueue(async () => {
            removeWorkItem(this.rootDir, itemSlug);
            return this.refreshState();
        });
    }

    /** Assign a work item to an agent (sets assignee in the item index). */
    async assignItem(itemSlug: string, agentId: string): Promise<BacklogOutput> {
        return this.queue.enqueue(async () => {
            const doc = await BacklogDocument.load(this.rootDir);
            const changeset = doc.changeItemAssignee(itemSlug, agentId);
            await doc.commit(changeset);
            return this.refreshState();
        });
    }

    async archiveItem(itemSlug: string): Promise<BacklogOutput> {
        return this.queue.enqueue(async () => {
            // Writer does not yet expose archive; for now same as remove or extend writer later
            removeWorkItem(this.rootDir, itemSlug);
            return this.refreshState();
        });
    }

    async updateItemStatus(
        _itemSlug: string,
        _status: "open" | "archived",
    ): Promise<BacklogOutput> {
        return this.queue.enqueue(async () => {
            // Writer does not yet expose patch item index status; extend writer later
            return this.refreshState();
        });
    }

    async resetItemTasks(itemSlug: string): Promise<BacklogOutput> {
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
