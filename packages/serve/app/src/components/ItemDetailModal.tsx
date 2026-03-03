import { useEffect, useState, useRef } from "react";
import { TaskRow } from "./TaskRow";
import { StatusBadge } from "./StatusBadge";
import { EditItemContentModal } from "./EditItemContentModal";
import { EditTaskContentModal } from "./EditTaskContentModal";
import { TYPE_COLOR_MAP } from "../constants";
import type { DisplayItem } from "./Board";
import type { WorkerState } from "./WorkersPopover";

function getFocusables(container: HTMLElement): HTMLElement[] {
    const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll<HTMLElement>(sel)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
    );
}

export function ItemDetailModal({
    item,
    onClose,
    onTaskStatusChange,
    pendingTasks,
}: {
    item: DisplayItem;
    onClose: () => void;
    onTaskStatusChange: (taskId: string, newStatus: string) => void;
    pendingTasks: Set<string>;
}) {
    const [workers, setWorkers] = useState<WorkerState[]>([]);
    const [workersLoading, setWorkersLoading] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
    const [assigning, setAssigning] = useState(false);
    const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [showEditContent, setShowEditContent] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap and restore: save focus on open, trap Tab, restore on close
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const firstFocusable = modalRef.current && getFocusables(modalRef.current)[0];
    if (firstFocusable) {
      firstFocusable.focus();
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previousFocusRef.current?.focus) previousFocusRef.current.focus();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !modalRef.current) return;
      const focusables = getFocusables(modalRef.current);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current?.focus) previousFocusRef.current.focus();
    };
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
                    throw new Error(
                        (err as { error?: string }).error ?? `Assign failed (${res.status})`,
                    );
                }
                const workerLabel =
                    workers.find((w) => `${w.name}:${w.role}` === selectedWorkerId)?.name ??
                    selectedWorkerId;
                setAssignSuccess(workerLabel);
                setTimeout(() => onClose(), 1200);
            })
            .catch((err: Error) => {
                setAssignSuccess(`Error: ${err.message}`);
            })
            .finally(() => setAssigning(false));
    };

    // Sort tasks by priority
    const sortedTasks = [...item.tasks].sort((a, b) => a.priority.localeCompare(b.priority));

    const completed = item.tasks.filter((t) => t.status === "done").length;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                  if (previousFocusRef.current?.focus) previousFocusRef.current.focus();
                  onClose();
                }
            }}
            data-testid="modal-backdrop"
        >
            <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {item.id && (
                                <span className="shrink-0 text-slate-500 text-sm font-medium">
                                    #{item.id}
                                </span>
                            )}
                            <h3 className="text-lg font-semibold text-slate-800 truncate">
                                {item.name}
                            </h3>
                            {item.type && (
                                <span
                                    className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${TYPE_COLOR_MAP[item.type] ?? TYPE_COLOR_MAP.chore}`}
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
                        onClick={() => {
                          if (previousFocusRef.current?.focus) previousFocusRef.current.focus();
                          onClose();
                        }}
                        className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none p-1 shrink-0 ml-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 rounded"
                        aria-label="Close"
                        data-testid="close-button"
                    >
                        ✕
                    </button>
                </div>

                {/* Assign to worker */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center gap-3">
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
                        <span
                            className={`text-xs font-medium ${assignSuccess.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}
                        >
                            {assignSuccess.startsWith("Error")
                                ? assignSuccess
                                : `Assigned to ${assignSuccess}`}
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
                        <p className="text-slate-400 text-sm py-4 text-center">No tasks</p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {sortedTasks.map((task) => (
                                <TaskRow
                                    key={task.slug}
                                    task={task}
                                    onStatusChange={onTaskStatusChange}
                                    onEditContent={(id) => setEditTaskId(id)}
                                    isPending={pendingTasks.has(`${task.itemSlug}/${task.priority}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between px-6 py-4 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={() => setShowEditContent(true)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                        Edit content
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                          if (previousFocusRef.current?.focus) previousFocusRef.current.focus();
                          onClose();
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                    >
                        Close
                    </button>
                </div>
            </div>

            {showEditContent && (
                <EditItemContentModal
                    itemSlug={item.slug}
                    onClose={() => setShowEditContent(false)}
                    onSaved={() => setShowEditContent(false)}
                />
            )}
            {editTaskId && (
                <EditTaskContentModal
                    taskId={editTaskId}
                    taskName={item.tasks.find((t) => `${t.itemSlug}/${t.priority}` === editTaskId)?.name}
                    onClose={() => setEditTaskId(null)}
                    onSaved={() => setEditTaskId(null)}
                />
            )}
        </div>
    );
}
