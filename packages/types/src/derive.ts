import type { ItemStatus, TaskStatus } from "./types.js";

/**
 * Derive an item's status from its tasks per protocol:
 * - All tasks done → done
 * - Any task in-progress / ready-to-review / ready-to-test → in-progress
 * - Mix of done and todo tasks → in-progress
 * - All tasks todo → todo
 * - No tasks → todo
 */
export function deriveItemStatus(taskStatuses: TaskStatus[]): ItemStatus {
  if (taskStatuses.length === 0) return "todo";
  if (taskStatuses.every((s) => s === "done")) return "done";
  if (taskStatuses.every((s) => s === "todo")) return "todo";
  return "in-progress";
}
