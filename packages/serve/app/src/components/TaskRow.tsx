import { StatusBadge } from "./StatusBadge";

interface Task {
  name: string;
  status: string;
  priority: string;
  slug: string;
  itemSlug: string;
  source?: string;
}

export function TaskRow({
  task,
  onStatusChange,
  onEditContent,
  isPending,
}: {
  task: Task;
  onStatusChange: (taskSource: string, newStatus: string) => void;
  onEditContent?: (taskSource: string) => void;
  isPending: boolean;
}) {
  const isDone = task.status === "done";
  const taskSource = task.source ?? "";

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
      <span className="text-xs text-slate-400 font-mono w-6 shrink-0">
        {task.priority}
      </span>
      <span className="flex-1 text-sm text-slate-800 leading-snug min-w-0">{task.name}</span>
      <StatusBadge status={task.status} />
      {onEditContent && taskSource && (
        <button
          type="button"
          onClick={() => onEditContent(taskSource)}
          className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors shrink-0"
          aria-label={`Edit content of "${task.name}"`}
        >
          Edit
        </button>
      )}
      {isDone ? (
        <span
          className="w-7 h-7 flex items-center justify-center text-emerald-400 text-sm shrink-0"
          aria-label="Completed"
        >
          ✓
        </span>
      ) : (
        <button
          onClick={() => onStatusChange(taskSource, "done")}
          disabled={isPending}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          aria-label={`Mark "${task.name}" as done`}
        >
          {isPending ? "Saving..." : "Mark done"}
        </button>
      )}
    </div>
  );
}
