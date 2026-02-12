import { StatusBadge } from "./StatusBadge";

interface Task {
  name: string;
  status: string;
  priority: string;
  slug: string;
  itemSlug: string;
  source: string;
}

export function TaskRow({
  task,
  onStatusChange,
  isPending,
}: {
  task: Task;
  onStatusChange: (taskSource: string, newStatus: string) => void;
  isPending: boolean;
}) {
  const isDone = task.status === "done";

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
      <span className="text-xs text-slate-400 font-mono w-6 shrink-0">
        {task.priority}
      </span>
      <span className="flex-1 text-sm text-slate-800 leading-snug">{task.name}</span>
      <StatusBadge status={task.status} />
      {isDone ? (
        <span
          className="w-7 h-7 flex items-center justify-center text-emerald-400 text-sm"
          aria-label="Completed"
        >
          ✓
        </span>
      ) : (
        <button
          onClick={() => onStatusChange(task.source, "done")}
          disabled={isPending}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={`Mark "${task.name}" as done`}
        >
          {isPending ? "Saving..." : "Mark done"}
        </button>
      )}
    </div>
  );
}
