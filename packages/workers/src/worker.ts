import { buildBacklogOutput } from "@backlogmd/parser";
import type { BacklogOutput, ItemFolder, Task } from "@backlogmd/types";

/**
 * Parse the current backlog from a root directory.
 * Returns a BacklogOutput with items and tasks.
 */
export function parseBacklog(rootDir: string): BacklogOutput {
  return buildBacklogOutput(rootDir);
}

/**
 * Resolve a task by id. Supports:
 * - priority: "001"
 * - task slug (from parser): e.g. "setup"
 * - task ref slug (from index link text): e.g. "001-setup"
 * - itemSlug/priority: "001-feat-new-format/001"
 */
export function getTask(doc: BacklogOutput, taskId: string): Task | undefined {
  const id = taskId.trim();
  if (!id) return undefined;

  for (const task of doc.tasks) {
    if (task.priority === id) return task;
    if (task.slug === id) return task;
    if (`${task.itemSlug}/${task.priority}` === id) return task;
  }

  // Match by item task ref slug (e.g. "001-setup" from index link text)
  for (const item of doc.items) {
    for (const ref of item.tasks) {
      if (ref.slug === id || ref.fileName.replace(/\.md$/, "") === id) {
        const source = `work/${item.slug}/${ref.fileName}`;
        return doc.tasks.find((t: Task) => t.source === source);
      }
    }
  }

  return undefined;
}

/**
 * Get the item (context) that contains the given task.
 * Returns undefined if the task is not found.
 */
export function getWorkContext(doc: BacklogOutput, taskId: string): ItemFolder | undefined {
  const task = getTask(doc, taskId);
  if (!task) return undefined;

  return doc.items.find((item: ItemFolder) => item.slug === task.itemSlug);
}
