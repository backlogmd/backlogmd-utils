import { useEffect, useState } from "react";

export function EditTaskContentModal({
  taskId,
  taskName,
  onClose,
  onSaved,
}: {
  taskId: string;
  taskName?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const encoded = encodeURIComponent(taskId);
    fetch(`/api/tasks/${encoded}/content`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load content");
        return res.json();
      })
      .then((data: { content?: string }) => setContent(data.content ?? ""))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    setSaving(true);
    setError(null);
    const encoded = encodeURIComponent(taskId);
    fetch(`/api/tasks/${encoded}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((b) => Promise.reject(new Error((b as { error?: string }).error ?? "Save failed")));
      })
      .then(() => {
        onSaved?.();
        onClose();
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setSaving(false));
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="edit-task-content-modal-backdrop"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 truncate pr-8">
            Edit task {taskName ? `: ${taskName}` : ""}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 flex-1 min-h-0 flex flex-col">
          {loading ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : (
            <>
              <label htmlFor="task-content" className="block text-sm font-medium text-slate-600 mb-2">
                Full task file — METADATA (task, status, priority, dep) and body (description, acceptance criteria)
              </label>
              <textarea
                id="task-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full flex-1 min-h-[280px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-y"
                placeholder={"<!-- METADATA -->\n```yaml\ntask: Task title\nstatus: open\npriority: 1\n```\n\n<!-- DESCRIPTION -->\n..."}
                spellCheck="false"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
