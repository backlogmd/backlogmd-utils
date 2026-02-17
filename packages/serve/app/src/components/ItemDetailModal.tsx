import { useEffect, useState } from "react";
import { TaskRow } from "./TaskRow";
import { StatusBadge } from "./StatusBadge";
import type { DisplayItem } from "./Board";
import type { WorkerState } from "./WorkersPopover";

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
  pendingTasks,
}: {
  item: DisplayItem;
  onClose: () => void;
  onTaskStatusChange: (taskSource: string, newStatus: string) => void;
  pendingTasks: Set<string>;
}) {
  const [workers, setWorkers] = useState<WorkerState[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch workers when modal opens
  useEffect(() => {
    setWorkersLoading(true);
    setSelectedWorkerId("");
    fetch("/api/workers")
      .then((res) => (res.ok ? res.json() : { workers: [] }))
      .then((json: { workers: WorkerState[] }) => setWorkers(json.workers ?? []))
      .catch(() => setWorkers([]))
      .finally(() => setWorkersLoading(false));
  }, [item.slug]);

  const handleAssign = () => {
    if (!selectedWorkerId.trim()) return;
    setAssigning(true);
    setAssignSuccess(null);
    fetch("/api/workers/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: selectedWorkerId,
        itemId: item.slug,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? `Assign failed (${res.status})`);
        }
        const workerLabel = workers.find((w) => `${w.name}:${w.role}` === selectedWorkerId)?.name ?? selectedWorkerId;
        setAssignSuccess(workerLabel);
        setTimeout(() => onClose(), 1200);
      })
      .catch((err: Error) => {
        setAssignSuccess(`Error: ${err.message}`);
      })
      .finally(() => setAssigning(false));
  };

  // Sort tasks by priority
  const sortedTasks = [...item.tasks].sort((a, b) =>
    a.priority.localeCompare(b.priority),
  );

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
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {item.id && (
                <span className="shrink-0 text-slate-500 text-sm font-medium">#{item.id}</span>
              )}
              <h3 className="text-lg font-semibold text-slate-800 truncate">
                {item.name}
              </h3>
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
            {item.assignee && (
              <p className="text-xs text-slate-500">Assigned to {item.assignee}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none p-1 shrink-0 ml-3"
            aria-label="Close"
            data-testid="close-button"
          >
            ✕
          </button>
        </div>

        {/* Assign to worker */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Assign to</span>
          <select
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
            disabled={workersLoading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-50"
            aria-label="Select worker"
            data-testid="assign-worker-select"
          >
            <option value="">Select a worker…</option>
            {workers.map((w) => {
              const id = `${w.name}:${w.role}`;
              return (
                <option key={id} value={id}>
                  {w.name} ({w.role})
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedWorkerId.trim() || assigning || workersLoading}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors"
            data-testid="assign-button"
          >
            {assigning ? "Assigning…" : "Assign"}
          </button>
          {assignSuccess && (
            <span className={`text-xs font-medium ${assignSuccess.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>
              {assignSuccess.startsWith("Error") ? assignSuccess : `Assigned to ${assignSuccess}`}
            </span>
          )}
          {workers.length === 0 && !workersLoading && !assignSuccess && (
            <span className="text-xs text-slate-400">No workers connected</span>
          )}
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
            <p className="text-slate-400 text-sm py-4 text-center">
              No tasks
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedTasks.map((task) => (
                <TaskRow
                  key={task.slug}
                  task={task}
                  onStatusChange={onTaskStatusChange}
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
