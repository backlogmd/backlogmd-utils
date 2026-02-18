import type { BacklogmdDocument, Task, TaskDto, WorkItemDto, WorkItemStatus } from "@backlogmd/types";

function deriveStatus(tasks: Task[]): WorkItemStatus {
    if (tasks.length === 0) return "open";
    if (tasks.every((t) => t.status === "plan")) return "plan";
    if (tasks.every((t) => t.status === "done")) return "done";
    if (tasks.some((t) => t.status === "in-progress" || t.status === "review"))
        return "in-progress";
    if (tasks.some((t) => t.assignee)) return "claimed";
    return "open";
}

export function fromBacklogToDtos(backlog: BacklogmdDocument): WorkItemDto[] {
    return backlog.work.map((workItem) => {
        const tasks = backlog.tasks.filter((t) => t.itemSlug === workItem.slug);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const taskDtos: TaskDto[] = tasks.map(({ source, ...rest }): TaskDto => rest);
        return {
            slug: workItem.slug,
            type: workItem.type,
            status: deriveStatus(tasks),
            tasks: taskDtos,
        };
    });
}

