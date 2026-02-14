import type { ItemStatus, TaskStatus } from "./types.js";

/**
 * Derive an item's status from its tasks per SPEC v3:
 * - No tasks → open
 * - All tasks done → done
 * - All tasks in plan or open → open
 * - Otherwise → in-progress
 */
export function deriveItemStatus(taskStatuses: TaskStatus[]): ItemStatus {
  if (taskStatuses.length === 0) return "open";
  if (taskStatuses.every((s) => s === "done")) return "done";
  if (taskStatuses.every((s) => s === "open" || s === "plan")) return "open";
  return "in-progress";
}
