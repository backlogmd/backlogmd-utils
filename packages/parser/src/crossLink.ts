import type {
  BacklogEntry,
  ItemFolder,
  Task,
  ValidationIssue,
} from "./types.js";

export interface CrossLinkResult {
  entries: BacklogEntry[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Detect circular dependencies in the task graph.
 * Returns a list of cycles found (each as an array of task keys).
 */
function detectCycles(tasks: Task[]): string[][] {
  // Build a map of itemSlug/tid → task for dependency resolution
  const taskByKey = new Map<string, Task>();
  for (const t of tasks) {
    taskByKey.set(`${t.itemSlug}/${t.tid}`, t);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(key: string, path: string[]): void {
    if (inStack.has(key)) {
      const cycleStart = path.indexOf(key);
      cycles.push(path.slice(cycleStart).concat(key));
      return;
    }
    if (visited.has(key)) return;

    visited.add(key);
    inStack.add(key);

    const task = taskByKey.get(key);
    if (task) {
      for (const dep of task.dependsOn) {
        // dep is a task ID within the same item
        const depKey = `${task.itemSlug}/${dep}`;
        if (taskByKey.has(depKey)) {
          dfs(depKey, [...path, key]);
        }
      }
    }

    inStack.delete(key);
  }

  for (const key of taskByKey.keys()) {
    if (!visited.has(key)) {
      dfs(key, []);
    }
  }

  return cycles;
}

/**
 * Build cross-references and validate consistency.
 *
 * In SPEC v3, the backlog and index files are simple link lists.
 * Validation checks:
 * 1. Each backlog entry has a matching item folder
 * 2. Each item folder's task refs have matching task files
 * 3. Task dependency graph has no cycles
 * 4. dep references point to valid task IDs within the same item
 */
export function crossLink(
  entries: BacklogEntry[],
  itemFolders: ItemFolder[],
  tasks: Task[],
): CrossLinkResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const folderMap = new Map<string, ItemFolder>();
  for (const folder of itemFolders) {
    folderMap.set(folder.slug, folder);
  }

  // 1. Validate backlog entries have matching item folders
  for (const entry of entries) {
    if (!folderMap.has(entry.slug)) {
      errors.push({
        code: "ENTRY_MISSING_FOLDER",
        message: `Backlog entry "${entry.slug}" has no matching item folder in work/`,
        source: entry.source,
      });
    }
  }

  // 2. Warn about orphan item folders (in work/ but not in backlog.md)
  const entrySlugSet = new Set(entries.map((e) => e.slug));
  for (const folder of itemFolders) {
    if (!entrySlugSet.has(folder.slug)) {
      warnings.push({
        code: "ORPHAN_FOLDER",
        message: `Item folder "${folder.slug}" exists in work/ but is not listed in backlog.md`,
        source: folder.source,
      });
    }
  }

  // 3. Validate task refs have matching task files
  const tasksByItem = new Map<string, Task[]>();
  for (const task of tasks) {
    const existing = tasksByItem.get(task.itemSlug) ?? [];
    existing.push(task);
    tasksByItem.set(task.itemSlug, existing);
  }

  for (const folder of itemFolders) {
    const itemTasks = tasksByItem.get(folder.slug) ?? [];
    const taskFileSet = new Set(itemTasks.map((t) => t.source));

    for (const ref of folder.tasks) {
      const expectedSource = `work/${folder.slug}/${ref.fileName}`;
      if (!taskFileSet.has(expectedSource)) {
        warnings.push({
          code: "INDEX_TASK_MISSING_FILE",
          message: `Item "${folder.slug}" index references "${ref.fileName}" but no matching task file was found`,
          source: folder.source,
        });
      }
    }
  }

  // 4. Validate dep references point to valid task IDs within the same item
  for (const task of tasks) {
    const itemTasks = tasksByItem.get(task.itemSlug) ?? [];
    const validTids = new Set(itemTasks.map((t) => t.tid));

    for (const dep of task.dependsOn) {
      if (!validTids.has(dep)) {
        warnings.push({
          code: "INVALID_DEP",
          message: `Task "${task.tid}" in item "${task.itemSlug}" depends on tid "${dep}" which does not exist`,
          source: task.source,
        });
      }
      if (dep === task.tid) {
        errors.push({
          code: "SELF_DEP",
          message: `Task "${task.tid}" in item "${task.itemSlug}" depends on itself`,
          source: task.source,
        });
      }
    }
  }

  // 5. Validate task dependency graph for cycles
  const cycles = detectCycles(tasks);
  for (const cycle of cycles) {
    errors.push({
      code: "CIRCULAR_DEPENDENCY",
      message: `Circular dependency detected: ${cycle.join(" → ")}`,
      source: tasks.find((t) => `${t.itemSlug}/${t.tid}` === cycle[0])?.source ?? "",
    });
  }

  return { entries, errors, warnings };
}
