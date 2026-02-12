import { useState, useCallback } from "react";

export function useTaskStatusUpdate() {
  const [pendingTasks, setPendingTasks] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const updateTaskStatus = useCallback(
    async (taskSource: string, newStatus: string): Promise<void> => {
      setError(null);
      setPendingTasks((prev) => new Set(prev).add(taskSource));

      try {
        const encodedSource = encodeURIComponent(taskSource);
        const res = await fetch(`/api/tasks/${encodedSource}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `HTTP ${res.status}`);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setPendingTasks((prev) => {
          const next = new Set(prev);
          next.delete(taskSource);
          return next;
        });
      }
    },
    [],
  );

  return { updateTaskStatus, pendingTasks, error };
}
