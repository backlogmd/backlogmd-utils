import { useState, useEffect, useRef } from "react";

export interface WorkerState {
  name: string;
  role: string;
  status: string;
  taskId?: string;
  taskTitle?: string;
  lastLogs: string[];
  lastSeen: string;
}

interface WorkersPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  workerCount: number;
}

export function WorkersPopover({
  isOpen,
  onClose,
  anchorRef,
  workerCount,
}: WorkersPopoverProps) {
  const [workers, setWorkers] = useState<WorkerState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetch("/api/workers")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load workers");
        return res.json();
      })
      .then((json: { workers: WorkerState[] }) => {
        setWorkers(json.workers ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (
        anchor?.contains(e.target as Node) ||
        panel?.contains(e.target as Node)
      )
        return;
      onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const statusColor = (status: string) => {
    switch (status) {
      case "idle":
        return "bg-slate-200 text-slate-600";
      case "working":
      case "busy":
        return "bg-amber-100 text-amber-800";
      case "done":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-1 z-50 min-w-[280px] max-w-sm bg-white rounded-lg border border-slate-200 shadow-lg py-2"
      data-testid="workers-popover"
    >
      <div className="px-3 py-1.5 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">Workers</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {workerCount} worker{workerCount !== 1 ? "s" : ""} connected
        </p>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {loading && (
          <div className="px-3 py-4 text-center text-sm text-slate-500">
            Loading…
          </div>
        )}
        {error && (
          <div className="px-3 py-4 text-center text-sm text-red-600">
            {error}
          </div>
        )}
        {!loading && !error && workers.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-slate-500">
            No workers have reported yet.
          </div>
        )}
        {!loading && !error && workers.length > 0 && (
          <ul className="py-1">
            {workers.map((w) => (
              <li
                key={`${w.name}:${w.role}`}
                className="px-3 py-2 hover:bg-slate-50 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {w.name}
                  </span>
                  <span
                    className={`shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded ${statusColor(w.status)}`}
                  >
                    {w.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">{w.role}</span>
                  {w.taskTitle && (
                    <>
                      <span>·</span>
                      <span className="truncate" title={w.taskTitle}>
                        {w.taskTitle}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Last seen {new Date(w.lastSeen).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
