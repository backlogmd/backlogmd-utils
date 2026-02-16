import fs from "node:fs";
import path from "node:path";
import {
  type BacklogOutput,
  type TaskStatus,
} from "@backlogmd/types";
import { buildBacklogOutput } from "@backlogmd/parser";
import type { Changeset, FileCache, FilePatch } from "./types.js";
import { patchMetadataField, patchItemIndexMetadataField } from "./patch.js";
import { applyChangeset } from "./apply.js";

/**
 * BacklogDocument — a virtual DOM for the .backlogmd/ directory.
 *
 * Load the backlog from disk, apply mutations that cascade through
 * related files, inspect the resulting patches, and commit them
 * back to disk as surgical edits.
 *
 * SPEC v2: Task metadata lives in fenced code blocks inside HTML
 * comment sections. Item index and backlog files are simple bullet
 * lists with no metadata to patch.
 */
export class BacklogDocument {
  private _model: BacklogOutput;
  private _rootDir: string;
  private _cache: FileCache;

  private constructor(
    model: BacklogOutput,
    rootDir: string,
    cache: FileCache,
  ) {
    this._model = model;
    this._rootDir = rootDir;
    this._cache = cache;
  }

  /**
   * Load a BacklogDocument from a .backlogmd/ directory.
   *
   * Parses the backlog using @backlogmd/parser and reads all source
   * files into an in-memory cache for surgical patching.
   */
  static async load(rootDir: string): Promise<BacklogDocument> {
    const absRoot = path.resolve(rootDir);
    const model = buildBacklogOutput(absRoot);
    const cache: FileCache = new Map();

    // Cache all source files referenced in the model
    const filePaths = new Set<string>();

    // backlog.md
    filePaths.add("backlog.md");

    // item index files
    for (const folder of model.items) {
      filePaths.add(folder.source);
    }

    // task files
    for (const task of model.tasks) {
      filePaths.add(task.source);
    }

    for (const filePath of filePaths) {
      const absPath = path.join(absRoot, filePath);
      if (fs.existsSync(absPath)) {
        cache.set(filePath, fs.readFileSync(absPath, "utf-8"));
      }
    }

    return new BacklogDocument(model, absRoot, cache);
  }

  /** Read-only access to the current parsed model. */
  get model(): BacklogOutput {
    return this._model;
  }

  /** The absolute root directory of the .backlogmd/ folder. */
  get rootDir(): string {
    return this._rootDir;
  }

  /**
   * Change a task's status and compute all cascading patches.
   *
   * Returns a Changeset that can be inspected (dry-run) or committed.
   *
   * SPEC v2 cascade:
   * 1. Patch the task file's metadata code block Status field
   *
   * In SPEC v2, item index (index.md) is a simple bullet list with no
   * status column, and backlog.md has no status field — so no cascade
   * beyond the task file itself. Item status is derived at read time.
   *
   * @param taskId    - The task source path, e.g. "work/my-feature/003-task.md",
   *                    or "itemSlug/priority" format, e.g. "my-feature/003"
   * @param newStatus - The new task status
   * @returns A Changeset with all patches and model snapshots
   *
   * @throws If the task is not found
   */
  changeTaskStatus(taskId: string, newStatus: TaskStatus): Changeset {
    // Find the task by source path or itemSlug/priority
    const task = this._model.tasks.find(
      (t) =>
        t.source === taskId ||
        `${t.itemSlug}/${t.priority}` === taskId,
    );

    if (!task) {
      throw new Error(`Task "${taskId}" not found in the model`);
    }

    const oldStatus = task.status;
    if (oldStatus === newStatus) {
      // Return an empty changeset — nothing to do
      return {
        patches: [],
        modelBefore: structuredClone(this._model),
        modelAfter: structuredClone(this._model),
      };
    }

    const patches: FilePatch[] = [];
    const modelAfter: BacklogOutput = structuredClone(this._model);

    // --- 1. Patch the task file ---
    const taskFileContent = this._cache.get(task.source);
    if (!taskFileContent) {
      throw new Error(`Task file "${task.source}" not found in cache`);
    }

    // SPEC v4 uses "status:" (lowercase); SPEC v2 uses "Status:"
    let taskPatch: { patched: string; original: string; replacement: string };
    try {
      taskPatch = patchMetadataField(taskFileContent, "status", newStatus);
    } catch {
      taskPatch = patchMetadataField(taskFileContent, "Status", newStatus);
    }
    patches.push({
      filePath: task.source,
      original: taskPatch.original,
      replacement: taskPatch.replacement,
      description: `task status: ${oldStatus} → ${newStatus}`,
    });

    // Update model: task status
    const modelTask = modelAfter.tasks.find(
      (t) => t.source === task.source,
    )!;
    modelTask.status = newStatus;

    return {
      patches,
      modelBefore: structuredClone(this._model),
      modelAfter,
    };
  }

  /**
   * Change a task's assignee (SPEC v4). Returns a Changeset; call commit() to write.
   */
  changeTaskAssignee(taskId: string, assignee: string): Changeset {
    const task = this._model.tasks.find(
      (t) =>
        t.source === taskId ||
        `${t.itemSlug}/${t.priority}` === taskId,
    );
    if (!task) throw new Error(`Task "${taskId}" not found in the model`);
    const taskFileContent = this._cache.get(task.source);
    if (!taskFileContent) throw new Error(`Task file "${task.source}" not found in cache`);
    let taskPatch: { patched: string; original: string; replacement: string };
    try {
      taskPatch = patchMetadataField(taskFileContent, "assignee", assignee);
    } catch {
      return {
        patches: [],
        modelBefore: structuredClone(this._model),
        modelAfter: structuredClone(this._model),
      };
    }
    const modelAfter: BacklogOutput = structuredClone(this._model);
    const modelTask = modelAfter.tasks.find((t) => t.source === task.source)!;
    modelTask.assignee = assignee;
    return {
      patches: [
        {
          filePath: task.source,
          original: taskPatch.original,
          replacement: taskPatch.replacement,
          description: `task assignee → ${assignee}`,
        },
      ],
      modelBefore: structuredClone(this._model),
      modelAfter,
    };
  }

  /**
   * Change a work item's assignee (SPEC v4 item index). Returns a Changeset; call commit() to write.
   */
  changeItemAssignee(itemSlug: string, assignee: string): Changeset {
    const item = this._model.items.find((i) => i.slug === itemSlug);
    if (!item) throw new Error(`Item "${itemSlug}" not found in the model`);
    const indexContent = this._cache.get(item.source);
    if (!indexContent) throw new Error(`Item index "${item.source}" not found in cache`);

    let itemPatch: { patched: string; original: string; replacement: string };
    try {
      itemPatch = patchItemIndexMetadataField(indexContent, "assignee", assignee);
    } catch (e) {
      throw new Error(`Failed to patch item assignee: ${(e as Error).message}`);
    }

    const modelAfter: BacklogOutput = structuredClone(this._model);
    const modelItem = modelAfter.items.find((i) => i.slug === itemSlug)!;
    modelItem.assignee = assignee;

    return {
      patches: [
        {
          filePath: item.source,
          original: itemPatch.original,
          replacement: itemPatch.replacement,
          description: `item assignee → ${assignee}`,
        },
      ],
      modelBefore: structuredClone(this._model),
      modelAfter,
    };
  }

  /**
   * Apply a changeset to disk, writing all patches.
   *
   * After committing, the document's internal model and cache are
   * updated to reflect the changes.
   */
  async commit(changeset: Changeset): Promise<void> {
    if (changeset.patches.length === 0) return;

    await applyChangeset(this._rootDir, changeset, this._cache);

    // Update internal model to the post-mutation state
    this._model = changeset.modelAfter;
  }
}
