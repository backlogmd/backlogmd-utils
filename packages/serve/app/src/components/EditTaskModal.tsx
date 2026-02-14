import { useState, useEffect } from "react";

interface EditTaskModalProps {
  taskSource: string;
  onClose: () => void;
  onSave: (
    taskSource: string,
    updates: {
      title?: string;
      description?: string;
      acceptanceCriteria?: { text: string; checked: boolean }[];
    },
  ) => void;
}

interface TaskContent {
  title: string;
  description: string;
  acceptanceCriteria: { text: string; checked: boolean }[];
}

export function EditTaskModal({ taskSource, onClose, onSave }: EditTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTask() {
      try {
        const encoded = encodeURIComponent(taskSource);
        const res = await fetch(`/api/task?source=${encoded}`);
        if (!res.ok) {
          throw new Error("Failed to fetch task");
        }
        const data: TaskContent = await res.json();
        setTitle(data.title);
        setDescription(data.description);
        setAcceptanceCriteria(data.acceptanceCriteria.map((ac) => ac.text));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchTask();
  }, [taskSource]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const ac = acceptanceCriteria
      .filter((t) => t.trim())
      .map((text) => ({ text: text.trim(), checked: false }));

    onSave(taskSource, {
      title: title.trim(),
      description: description.trim(),
      acceptanceCriteria: ac,
    });
    onClose();
  };

  const addAcceptanceCriterion = () => {
    setAcceptanceCriteria([...acceptanceCriteria, ""]);
  };

  const updateAcceptanceCriterion = (index: number, value: string) => {
    const updated = [...acceptanceCriteria];
    updated[index] = value;
    setAcceptanceCriteria(updated);
  };

  const removeAcceptanceCriterion = (index: number) => {
    setAcceptanceCriteria(acceptanceCriteria.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <p className="text-red-600">Error: {error}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 text-sm text-slate-600">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[80vh] overflow-auto">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Edit Task</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Implement login page"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Add details about this task..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Acceptance Criteria
            </label>
            {acceptanceCriteria.map((ac, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={ac}
                  onChange={(e) => updateAcceptanceCriterion(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Criterion..."
                />
                <button
                  type="button"
                  onClick={() => removeAcceptanceCriterion(index)}
                  className="text-red-500 hover:text-red-700 px-2"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAcceptanceCriterion}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Add criterion
            </button>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
