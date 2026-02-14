import { useEffect } from "react";
import { TaskRow } from "./TaskRow";
import { StatusBadge } from "./StatusBadge";
import type { DisplayItem } from "./Board";

const typeColorMap: Record<string, string> = {
  feat: "bg-blue-100 text-blue-700",
  fix: "bg-red-100 text-red-700",
  refactor: "bg-amber-100 text-amber-700",
  chore: "bg-slate-100 text-slate-600",
};

export function ItemDetailModal({
  item,
  onClose,
  onTaskStatusChange,
  onTaskDelete,
  onItemDelete,
  onItemReset,
  onTaskEdit,
  pendingTasks,
}: {
  item: DisplayItem;
  onClose: () => void;
  onTaskStatusChange: (taskSource: string, newStatus: string) => void;
  onTaskDelete: (taskSource: string) => void;
  onItemDelete: () => void;
  onItemReset: () => void;
  onTaskEdit?: (taskSource: string) => void;
  pendingTasks: Set<string>;
}) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Sort tasks by priority (lower number = higher priority)
  const sortedTasks = [...item.tasks].sort((a, b) => a.priority - b.priority);

  const completed = item.tasks.filter((t) => t.status === "done").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="modal-backdrop"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className="text-lg font-semibold text-slate-800 truncate">{item.name}</h3>
            {item.type && (
              <span
                className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${typeColorMap[item.type] ?? typeColorMap.chore}`}
                data-testid="type-badge"
              >
                {item.type}
              </span>
            )}
            <StatusBadge status={item.status} />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={onItemReset}
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors text-sm px-2 py-1 rounded"
              aria-label="Reset all tasks to open"
              title="Reset all tasks to open"
            >
              ↺ Open
            </button>
            <button
              onClick={onItemDelete}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors text-sm px-2 py-1 rounded"
              aria-label="Delete item"
            >
              🗑️
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none p-1 shrink-0"
              aria-label="Close"
              data-testid="close-button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">Tasks</span>
            <span className="text-xs text-slate-400">
              {completed}/{item.tasks.length} done
            </span>
          </div>

          {sortedTasks.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">No tasks</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedTasks.map((task) => (
                <TaskRow
                  key={task.slug}
                  task={task}
                  onStatusChange={onTaskStatusChange}
                  onDelete={onTaskDelete}
                  onEdit={onTaskEdit}
                  isPending={pendingTasks.has(task.source)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
