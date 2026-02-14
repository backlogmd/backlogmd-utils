import type { ItemStatus, TaskStatus } from "@backlogmd/types";

/**
 * Derive an item's status from its tasks per SPEC v3:
 * - No tasks → open
 * - All tasks done → done
 * - All tasks open → open
 * - Otherwise → in-progress
 */
export function deriveItemStatus(taskStatuses: TaskStatus[]): ItemStatus {
  if (taskStatuses.length === 0) return "open";
  if (taskStatuses.every((s) => s === "done")) return "done";
  if (taskStatuses.every((s) => s === "open")) return "open";
  return "in-progress";
}
