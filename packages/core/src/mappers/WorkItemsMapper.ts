import type { BacklogmdDocument, Task, TaskDto, WorkItemDto, WorkItemStatus } from "@backlogmd/types";

/** Derive display name from slug when work item has no name (e.g. legacy index). */
function slugToDisplayName(slug: string): string {
  const cleaned = slug
    .replace(/^\d+-(?:feat|fix|refactor|chore)-/, "")
    .replace(/^\d+-/, "");
  return cleaned.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveStatus(tasks: Task[], itemAssignee?: string): WorkItemStatus {
    if (tasks.length === 0) return "open";
    if (tasks.every((t) => t.status === "plan")) return "plan";
    if (tasks.every((t) => t.status === "done")) return "done";
    if (tasks.some((t) => t.status === "in-progress" || t.status === "review"))
        return "in-progress";
    if (itemAssignee || tasks.some((t) => t.assignee)) return "claimed";
    return "open";
}

export function fromBacklogToDtos(backlog: BacklogmdDocument): WorkItemDto[] {
    return backlog.work.map((workItem) => {
        const tasks = backlog.tasks.filter((t) => t.itemSlug === workItem.slug);
        const taskDtos: TaskDto[] = tasks.map((task): TaskDto => {
            const { source, ...rest } = task;
            return { ...rest, source };
        });
        return {
            slug: workItem.slug,
            name: workItem.name?.trim() ? workItem.name : slugToDisplayName(workItem.slug),
            type: workItem.type,
            status: deriveStatus(tasks, workItem.assignee),
            tasks: taskDtos,
            assignee: workItem.assignee,
            workDir: backlog.workDir,
        };
    });
}

