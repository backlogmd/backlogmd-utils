import fs from "node:fs";
import path from "node:path";
import {
  type BacklogOutput,
  type TaskStatus,
  type ItemStatus,
  deriveItemStatus,
} from "@backlogmd/types";
import { buildBacklogOutput } from "@backlogmd/parser";
import type { Changeset, FileCache, FilePatch } from "./types.js";
import { patchMetadataField, patchTableCell } from "./patch.js";
import { applyChangeset } from "./apply.js";

/** Column index of the Status cell in item index task tables (0-based) */
const TABLE_STATUS_COL = 2;

/**
 * BacklogDocument — a virtual DOM for the .backlogmd/ directory.
 *
 * Load the backlog from disk, apply mutations that cascade through
 * related files, inspect the resulting patches, and commit them
 * back to disk as surgical edits.
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
    for (const folder of model.itemFolders) {
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
   * Cascade:
   * 1. Patch the task file's `- **Status:**` line
   * 2. Patch the item index table's Status cell for this task
   * 3. If the item's derived status changed, patch backlog.md's `- **Status:**` line
   *
   * @param taskId    - The task ID, e.g. "my-feature/003"
   * @param newStatus - The new task status
   * @returns A Changeset with all patches and model snapshots
   *
   * @throws If the task is not found
   * @throws If the task already has the target status (no-op error)
   */
  changeTaskStatus(taskId: string, newStatus: TaskStatus): Changeset {
    const task = this._model.tasks.find((t) => t.id === taskId);
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

    const taskPatch = patchMetadataField(taskFileContent, "Status", newStatus);
    patches.push({
      filePath: task.source,
      original: taskPatch.original,
      replacement: taskPatch.replacement,
      description: `task status: ${oldStatus} → ${newStatus}`,
    });

    // Update model: task
    const modelTask = modelAfter.tasks.find((t) => t.id === taskId)!;
    modelTask.status = newStatus;

    // --- 2. Patch the item index table ---
    const itemSlug = taskId.split("/")[0];
    const folder = this._model.itemFolders.find((f) => f.slug === itemSlug);

    if (folder) {
      const indexContent = this._cache.get(folder.source);
      if (indexContent) {
        const tablePatch = patchTableCell(
          indexContent,
          task.priority,
          TABLE_STATUS_COL,
          newStatus,
        );
        patches.push({
          filePath: folder.source,
          original: tablePatch.original,
          replacement: tablePatch.replacement,
          description: `index table task ${task.priority} status: ${oldStatus} → ${newStatus}`,
        });

        // Update model: item folder task stub
        const modelFolder = modelAfter.itemFolders.find(
          (f) => f.slug === itemSlug,
        )!;
        const stub = modelFolder.tasks.find(
          (t) => t.priority === task.priority,
        );
        if (stub) {
          stub.status = newStatus;
        }
      }
    }

    // --- 3. Check if item's derived status changed → patch backlog.md ---
    const item = this._model.items.find((i) => i.itemSlug === itemSlug);
    if (item) {
      // Compute the new derived status using all tasks for this item
      const allTaskStatuses = modelAfter.tasks
        .filter((t) => t.itemId === item.id)
        .map((t) => t.status);

      const newDerivedStatus: ItemStatus = deriveItemStatus(allTaskStatuses);
      const oldDerivedStatus: ItemStatus =
        item.statusDerived ?? item.status;

      if (newDerivedStatus !== oldDerivedStatus) {
        const backlogContent = this._cache.get("backlog.md");
        if (backlogContent) {
          // backlog.md has multiple items — we need to patch the right one.
          // Each item section starts with ### and has its own Status field.
          // We locate the section for this item and patch within it.
          const sectionPatch = patchItemStatusInBacklog(
            backlogContent,
            item.id,
            item.name,
            newDerivedStatus,
          );
          patches.push({
            filePath: "backlog.md",
            original: sectionPatch.original,
            replacement: sectionPatch.replacement,
            description: `item "${item.name}" status: ${oldDerivedStatus} → ${newDerivedStatus}`,
          });
        }

        // Update model: roadmap item
        const modelItem = modelAfter.items.find(
          (i) => i.itemSlug === itemSlug,
        )!;
        modelItem.status = newDerivedStatus;
        modelItem.statusDerived = newDerivedStatus;
      }
    }

    return {
      patches,
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

/**
 * Patch the Status field for a specific item section in backlog.md.
 *
 * backlog.md contains multiple item sections like:
 *   ### 001 - Item Name
 *   - **Type:** feature
 *   - **Status:** todo
 *
 * We need to find the right section by item ID and patch only its Status line.
 */
function patchItemStatusInBacklog(
  content: string,
  itemId: string,
  itemName: string,
  newStatus: ItemStatus,
): { original: string; replacement: string } {
  // Find the section header for this item: ### 001 - Item Name
  const escapedId = itemId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionPattern = new RegExp(
    `^### ${escapedId} - .+$`,
    "m",
  );
  const sectionMatch = content.match(sectionPattern);
  if (!sectionMatch || sectionMatch.index === undefined) {
    throw new Error(
      `Item section "### ${itemId} - ${itemName}" not found in backlog.md`,
    );
  }

  // Extract the section text (from the header to the next ### or end of file)
  const sectionStart = sectionMatch.index;
  const restAfterHeader = content.slice(sectionStart + sectionMatch[0].length);
  const nextSectionMatch = restAfterHeader.match(/^### /m);
  const sectionEnd = nextSectionMatch?.index !== undefined
    ? sectionStart + sectionMatch[0].length + nextSectionMatch.index
    : content.length;

  const sectionText = content.slice(sectionStart, sectionEnd);

  // Patch the Status field within this section
  const statusPattern = /^(- \*\*Status:\*\*\s+).+$/m;
  const statusMatch = sectionText.match(statusPattern);
  if (!statusMatch) {
    throw new Error(
      `Status field not found in item "${itemName}" section of backlog.md`,
    );
  }

  const original = statusMatch[0];
  const replacement = `${statusMatch[1]}${newStatus}`;

  return { original, replacement };
}
