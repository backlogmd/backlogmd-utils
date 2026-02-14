import { useState } from "react";
import { StatusBadge } from "./StatusBadge";

interface Task {
  name: string;
  status: string;
  priority: number;
  slug: string;
  itemSlug: string;
  source: string;
}

const VALID_STATUSES = ["plan", "open", "ip", "review", "done"];

export function TaskRow({
  task,
  onStatusChange,
  onDelete,
  onEdit,
  isPending,
}: {
  task: Task;
  onStatusChange: (taskSource: string, newStatus: string) => void;
  onDelete: (taskSource: string) => void;
  onEdit?: (taskSource: string) => void;
  isPending: boolean;
}) {
  const isDone = task.status === "done";
  const [showDropdown, setShowDropdown] = useState(false);

  const cycleStatus = () => {
    const currentIndex = VALID_STATUSES.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % VALID_STATUSES.length;
    onStatusChange(task.source, VALID_STATUSES[nextIndex]);
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
      <span className="text-xs text-slate-400 font-mono w-6 shrink-0">{task.priority}</span>
      <span className="flex-1 text-sm text-slate-800 leading-snug">{task.name}</span>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
        >
          <StatusBadge status={task.status} />
          <span className="text-xs">▼</span>
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[120px]">
            {VALID_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => {
                  onStatusChange(task.source, status);
                  setShowDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                  task.status === status ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-700"
                }`}
              >
                → {status}
              </button>
            ))}
          </div>
        )}
      </div>
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
      {onEdit && (
        <button
          onClick={() => onEdit(task.source)}
          disabled={isPending}
          className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={`Edit "${task.name}"`}
        >
          Edit
        </button>
      )}
      <button
        onClick={() => {
          if (confirm(`Delete task "${task.name}"?`)) {
            onDelete(task.source);
          }
        }}
        disabled={isPending}
        className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label={`Delete "${task.name}"`}
      >
        ✕
      </button>
    </div>
  );
}
