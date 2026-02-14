import fs from "node:fs";
import path from "node:path";
import type { Manifest, TaskStatus } from "@backlogmd/types";
import { OperationQueue } from "./queue.js";
import {
  readManifest,
  writeManifest,
  generateManifestFromFiles,
} from "./operations/manifestOps.js";
import {
  closeTask,
  startTask,
  updateTaskStatus,
  addTask,
  removeTask,
  getTaskContent,
  updateTaskContent,
  assignAgent,
} from "./operations/taskOps.js";
import { addItem, removeItem, archiveItem, updateItemStatus } from "./operations/itemOps.js";
import { reconcileManifestToMd, reconcileBacklogMd } from "./reconcile.js";
import type { CoreOptions, TaskAddInput, ItemAddInput, TaskContent } from "./types.js";

export class BacklogCore {
  private rootDir: string;
  private manifest: Manifest;
  private queue: OperationQueue;
  private autoReconcile: boolean;

  private constructor(rootDir: string, manifest: Manifest, autoReconcile: boolean) {
    this.rootDir = rootDir;
    this.manifest = manifest;
    this.autoReconcile = autoReconcile;
    this.queue = new OperationQueue();
  }

  static async load(options: CoreOptions): Promise<BacklogCore> {
    const absRoot = path.resolve(options.rootDir);
    const autoReconcile = options.autoReconcile ?? true;

    let manifest = readManifest(absRoot);

    if (!manifest) {
      manifest = generateManifestFromFiles(absRoot);
      writeManifest(absRoot, manifest);
    }

    return new BacklogCore(absRoot, manifest, autoReconcile);
  }

  getManifest(): Manifest {
    return this.manifest;
  }

  async closeTask(taskId: string): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const result = closeTask(this.rootDir, this.manifest, taskId);
      this.manifest = result.manifest;

      writeManifest(this.rootDir, this.manifest);

      if (this.autoReconcile) {
        reconcileManifestToMd(this.rootDir, this.manifest);
      }

      return this.manifest;
    });
  }

  async startTask(taskId: string): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const result = startTask(this.rootDir, this.manifest, taskId);
      this.manifest = result.manifest;

      writeManifest(this.rootDir, this.manifest);

      if (this.autoReconcile) {
        reconcileManifestToMd(this.rootDir, this.manifest);
      }

      return this.manifest;
    });
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const result = updateTaskStatus(this.rootDir, this.manifest, taskId, status);
      this.manifest = result.manifest;

      writeManifest(this.rootDir, this.manifest);

      if (this.autoReconcile) {
        reconcileManifestToMd(this.rootDir, this.manifest);
      }

      return this.manifest;
    });
  }

  async addTask(itemSlug: string, input: TaskAddInput): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const result = addTask(
        this.rootDir,
        this.manifest,
        itemSlug,
        input.title,
        input.tid,
        input.status === "plan" ? "plan" : "open",
      );
      this.manifest = result.manifest;

      writeManifest(this.rootDir, this.manifest);

      return this.manifest;
    });
  }

  async removeTask(taskId: string): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const result = removeTask(this.rootDir, this.manifest, taskId);
      this.manifest = result.manifest;

      writeManifest(this.rootDir, this.manifest);

      return this.manifest;
    });
  }

  async getTaskContent(taskId: string): Promise<TaskContent> {
    return getTaskContent(this.rootDir, this.manifest, taskId);
  }

  async updateTaskContent(taskId: string, updates: Partial<TaskContent>): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const result = updateTaskContent(this.rootDir, this.manifest, taskId, updates);
      this.manifest = result.manifest;

      writeManifest(this.rootDir, this.manifest);

      return this.manifest;
    });
  }

  async assignAgent(taskId: string, agentId: string): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const result = assignAgent(this.rootDir, this.manifest, taskId, agentId);
      this.manifest = result.manifest;

      writeManifest(this.rootDir, this.manifest);

      if (this.autoReconcile) {
        reconcileManifestToMd(this.rootDir, this.manifest);
      }

      return this.manifest;
    });
  }

  async addItem(input: ItemAddInput): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const result = addItem(this.rootDir, this.manifest, input.title, input.type);
      this.manifest = result.manifest;

      writeManifest(this.rootDir, this.manifest);

      if (this.autoReconcile) {
        reconcileBacklogMd(this.rootDir, this.manifest);
      }

      return this.manifest;
    });
  }

  async removeItem(itemSlug: string): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const result = removeItem(this.rootDir, this.manifest, itemSlug);
      this.manifest = result.manifest;

      writeManifest(this.rootDir, this.manifest);

      if (this.autoReconcile) {
        reconcileBacklogMd(this.rootDir, this.manifest);
      }

      return this.manifest;
    });
  }

  async archiveItem(itemSlug: string): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const result = archiveItem(this.rootDir, this.manifest, itemSlug);
      this.manifest = result.manifest;

      writeManifest(this.rootDir, this.manifest);

      if (this.autoReconcile) {
        reconcileBacklogMd(this.rootDir, this.manifest);
      }

      return this.manifest;
    });
  }

  async updateItemStatus(itemSlug: string, status: "open" | "archived"): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const result = updateItemStatus(this.rootDir, this.manifest, itemSlug, status);
      this.manifest = result.manifest;

      writeManifest(this.rootDir, this.manifest);

      return this.manifest;
    });
  }

  async resetItemTasks(itemSlug: string): Promise<Manifest> {
    return this.queue.enqueue(async () => {
      const itemIndex = this.manifest.items.findIndex(
        (i) => i.slug === itemSlug || i.id === itemSlug,
      );
      if (itemIndex === -1) {
        throw new Error(`Item "${itemSlug}" not found`);
      }

      const item = this.manifest.items[itemIndex];

      for (const task of item.tasks) {
        if (task.s !== "done") {
          const taskSource = `${item.path}/${task.file}`;
          updateTaskStatus(this.rootDir, this.manifest, taskSource, "open");
        }
      }

      writeManifest(this.rootDir, this.manifest);

      if (this.autoReconcile) {
        reconcileManifestToMd(this.rootDir, this.manifest);
      }

      return this.manifest;
    });
  }

  async reconcile(): Promise<void> {
    await this.queue.enqueue(async () => {
      reconcileManifestToMd(this.rootDir, this.manifest);
      reconcileBacklogMd(this.rootDir, this.manifest);
    });
  }
}
