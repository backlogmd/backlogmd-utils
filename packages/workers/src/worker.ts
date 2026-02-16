import { buildBacklogmdDocument } from "@backlogmd/parser";
import type { BacklogmdDocument, Task, WorkItem } from "@backlogmd/types";

/**
 * Parse the current backlog from a root directory.
 * Returns a BacklogmdDocument with work items and tasks.
 */
export function parseBacklog(rootDir: string): BacklogmdDocument {
  return buildBacklogmdDocument(rootDir);
}

/**
 * Resolve a task by id. Supports:
 * - priority: "001"
 * - task slug (from parser): e.g. "setup"
 * - task ref slug (from index link text): e.g. "001-setup"
 * - itemSlug/priority: "001-feat-new-format/001"
 */
export function getTask(doc: BacklogmdDocument, taskId: string): Task | undefined {
  const id = taskId.trim();
  if (!id) return undefined;

  for (const task of doc.tasks) {
    if (task.priority === id) return task;
    if (task.slug === id) return task;
    if (`${task.itemSlug}/${task.priority}` === id) return task;
  }

  // Match by work item task ref slug (e.g. "001-setup" from index link text)
  for (const work of doc.work) {
    for (const ref of work.tasks) {
      if (ref.slug === id || ref.fileName.replace(/\.md$/, "") === id) {
        const source = `work/${work.slug}/${ref.fileName}`;
        return doc.tasks.find((t) => t.source === source);
      }
    }
  }

  return undefined;
}

/**
 * Get the work item (context) that contains the given task.
 * Returns undefined if the task is not found.
 */
export function getWorkContext(doc: BacklogmdDocument, taskId: string): WorkItem | undefined {
  const task = getTask(doc, taskId);
  if (!task) return undefined;

  return doc.work.find((w) => w.slug === task.itemSlug);
}
