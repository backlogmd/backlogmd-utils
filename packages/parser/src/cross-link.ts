import type {
  RoadmapItem,
  ItemFolder,
  ItemStatus,
  Task,
  ValidationIssue,
} from "./types.js";

export interface CrossLinkResult {
  items: RoadmapItem[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Derive an item's status from its tasks per protocol:
 * - All tasks done → done
 * - Any task in-progress / ready-to-review / ready-to-test → in-progress
 * - Mix of done and todo tasks → in-progress
 * - All tasks todo → todo
 */
function deriveItemStatus(tasks: Task[]): ItemStatus {
  if (tasks.length === 0) return "todo";
  if (tasks.every((t) => t.status === "done")) return "done";
  if (tasks.every((t) => t.status === "todo")) return "todo";
  return "in-progress";
}

/**
 * Detect circular dependencies in the task graph.
 * Returns a list of cycles found (each as an array of task IDs).
 */
function detectCycles(tasks: Task[]): string[][] {
  const taskMap = new Map<string, Task>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(taskId: string, path: string[]): void {
    if (inStack.has(taskId)) {
      const cycleStart = path.indexOf(taskId);
      cycles.push(path.slice(cycleStart).concat(taskId));
      return;
    }
    if (visited.has(taskId)) return;

    visited.add(taskId);
    inStack.add(taskId);

    const task = taskMap.get(taskId);
    if (task) {
      for (const dep of task.dependsOn) {
        dfs(dep, [...path, taskId]);
      }
    }

    inStack.delete(taskId);
  }

  for (const t of tasks) {
    if (!visited.has(t.id)) {
      dfs(t.id, []);
    }
  }

  return cycles;
}

/**
 * Build cross-references between items and tasks, derive item statuses,
 * and validate consistency between item index tables and task files.
 */
export function crossLink(
  items: RoadmapItem[],
  itemFolders: ItemFolder[],
  tasks: Task[],
): CrossLinkResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const itemMap = new Map<string, RoadmapItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }

  const folderMap = new Map<string, ItemFolder>();
  for (const folder of itemFolders) {
    folderMap.set(folder.slug, folder);
  }

  // 1. Link tasks to items and build task refs
  for (const task of tasks) {
    const item = itemMap.get(task.itemId);
    if (!item) {
      errors.push({
        code: "TASK_MISSING_ITEM",
        message: `Task "${task.name}" (${task.id}) references item ${task.itemId} which does not exist in the roadmap`,
        source: task.source,
      });
      continue;
    }
    item.taskRefs.push(task.id);
  }

  // 2. Validate item folder references
  for (const item of items) {
    if (item.itemSlug) {
      const folder = folderMap.get(item.itemSlug);
      if (!folder) {
        errors.push({
          code: "ITEM_MISSING_FOLDER",
          message: `Item ${item.id} ("${item.name}") references folder "${item.itemSlug}" which does not exist`,
          source: item.source,
        });
      }
    }
  }

  // 3. Validate table-vs-file consistency
  for (const folder of itemFolders) {
    for (const stub of folder.tasks) {
      const taskId = `${folder.slug}/${stub.priority}`;
      const task = tasks.find((t) => t.id === taskId);

      if (!task) {
        warnings.push({
          code: "TABLE_TASK_MISSING_FILE",
          message: `Item "${folder.name}" task table references task ${stub.priority} ("${stub.name}") but no task file was found`,
          source: folder.source,
        });
        continue;
      }

      if (stub.status !== task.status) {
        warnings.push({
          code: "STATUS_MISMATCH",
          message: `Task ${task.id} ("${task.name}"): table says "${stub.status}" but file says "${task.status}"`,
          source: task.source,
        });
      }

      if (stub.owner !== task.owner) {
        warnings.push({
          code: "OWNER_MISMATCH",
          message: `Task ${task.id} ("${task.name}"): table says owner "${stub.owner ?? "—"}" but file says "${task.owner ?? "—"}"`,
          source: task.source,
        });
      }
    }
  }

  // 4. Derive item status from tasks
  for (const item of items) {
    const itemTasks = tasks.filter((t) => t.itemId === item.id);
    item.statusDerived = deriveItemStatus(itemTasks);

    if (item.status !== item.statusDerived) {
      warnings.push({
        code: "ITEM_STATUS_MISMATCH",
        message: `Item ${item.id} ("${item.name}"): declared status "${item.status}" but derived status is "${item.statusDerived}"`,
        source: item.source,
      });
    }
  }

  // 5. Validate task dependency graph for cycles
  const cycles = detectCycles(tasks);
  for (const cycle of cycles) {
    errors.push({
      code: "CIRCULAR_DEPENDENCY",
      message: `Circular dependency detected: ${cycle.join(" → ")}`,
      source: tasks.find((t) => t.id === cycle[0])?.source ?? "",
    });
  }

  return { items, errors, warnings };
}
