import { useState, useEffect } from "react";
import { Column } from "./Column";
import { AddWorkModal } from "./AddWorkModal";
import { AddPlanModal } from "./AddPlanModal";
import { ItemDetailModal } from "./ItemDetailModal";
import { EditTaskModal } from "./EditTaskModal";
import { useTaskStatusUpdate } from "../hooks/useTaskStatusUpdate";

interface TaskRef {
  slug: string;
  fileName: string;
}

interface ItemFolder {
  slug: string;
  tasks: TaskRef[];
  source: string;
}

interface Task {
  name: string;
  status: string;
  priority: number;
  slug: string;
  itemSlug: string;
  dependsOn: string[];
  description: string;
  acceptanceCriteria: { text: string; checked: boolean }[];
  source: string;
}

interface BacklogData {
  entries: { slug: string }[];
  items: ItemFolder[];
  tasks: Task[];
}

/** Derive an item's status from its task statuses. */
function deriveStatus(taskStatuses: string[]): string {
  if (taskStatuses.length === 0) return "open";
  if (taskStatuses.every((s) => s === "done")) return "done";
  if (taskStatuses.every((s) => s === "open")) return "open";
  if (taskStatuses.every((s) => s === "plan")) return "plan";
  return "ip";
}

/** Convert a slug like "001-feat-user-auth" to a display name. */
function slugToName(slug: string): string {
  // Remove leading NNN- or NNN-type- prefix
  const cleaned = slug.replace(/^\d+-(?:feat|fix|refactor|chore)-/, "").replace(/^\d+-/, "");
  return cleaned.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Extract the Conventional Commits type from a slug, or null if absent. */
function slugToType(slug: string): string | null {
  const match = slug.match(/^\d+-(feat|fix|refactor|chore)-/);
  return match ? match[1] : null;
}

export interface DisplayItem {
  slug: string;
  name: string;
  type: string | null;
  status: string;
  tasks: Task[];
}

const columns = [
  { id: "plan", title: "Plan", color: "bg-slate-100", icon: "○" },
  { id: "open", title: "Open", color: "bg-col-todo", icon: "○" },
  { id: "reserved", title: "Reserved", color: "bg-purple-100", icon: "◐" },
  { id: "ip", title: "In Progress", color: "bg-col-inprogress", icon: "◐" },
  { id: "review", title: "Review", color: "bg-amber-100", icon: "◑" },
  { id: "block", title: "Blocked", color: "bg-red-100", icon: "⊘" },
  { id: "done", title: "Done", color: "bg-col-done", icon: "●" },
] as const;

export function Board({ data, searchQuery = "" }: { data: BacklogData; searchQuery?: string }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DisplayItem | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const { updateTaskStatus, deleteTask, pendingTasks } = useTaskStatusUpdate();

  const deleteItem = async (itemSlug: string) => {
    try {
      const encodedSlug = encodeURIComponent(itemSlug);
      const res = await fetch(`/api/work/${encodedSlug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
    } catch (err) {
      console.error("[backlogmd] Failed to delete item:", err);
      alert("Failed to delete item");
    }
  };

  const resetItemTasks = async (itemSlug: string) => {
    console.log("[resetItemTasks] Called with slug:", itemSlug);
    try {
      const encodedSlug = encodeURIComponent(itemSlug);
      const res = await fetch(`/api/work/${encodedSlug}/reset`, {
        method: "PATCH",
      });
      const text = await res.text();
      console.log("[resetItemTasks] Response:", res.status, text);
      if (!res.ok) {
        throw new Error(text);
      }
    } catch (err) {
      console.error("[backlogmd] Failed to reset item tasks:", err);
      alert(`Failed to reset item tasks: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Build display items from entries + items + tasks
  const displayItems: DisplayItem[] = [];

  for (const entry of data.entries) {
    const folder = data.items.find((f) => f.slug === entry.slug);
    const itemTasks = data.tasks.filter((t) => t.itemSlug === entry.slug);
    const status = deriveStatus(itemTasks.map((t) => t.status));

    displayItems.push({
      slug: entry.slug,
      name: slugToName(entry.slug),
      type: slugToType(entry.slug),
      status,
      tasks: itemTasks,
    });
  }

  // Keep modal in sync when data refreshes via SSE
  useEffect(() => {
    if (selectedItem) {
      const fresh = displayItems.find((item) => item.slug === selectedItem.slug);
      if (fresh) {
        setSelectedItem(fresh);
      } else {
        // Item no longer exists — close modal
        setSelectedItem(null);
      }
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter by search query
  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? displayItems.filter((item) => item.name.toLowerCase().includes(query))
    : displayItems;

  const byStatus: Record<string, DisplayItem[]> = {
    plan: [],
    open: [],
    reserved: [],
    ip: [],
    review: [],
    block: [],
    done: [],
  };

  for (const item of filtered) {
    if (byStatus[item.status]) {
      byStatus[item.status].push(item);
    }
  }

  const handleAddWork = (content: string) => {
    setShowAddModal(false);
  };

  const handleAddPlan = async (title: string, description: string) => {
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      setShowAddPlanModal(false);
    } catch (err) {
      console.error("[backlogmd] Failed to create plan:", err);
      alert("Failed to create plan");
    }
  };

  const handleEditTask = async (
    taskSource: string,
    updates: {
      title?: string;
      description?: string;
      acceptanceCriteria?: { text: string; checked: boolean }[];
    },
  ) => {
    try {
      const encoded = encodeURIComponent(taskSource);
      const res = await fetch(`/api/task?source=${encoded}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      setEditingTask(null);
    } catch (err) {
      console.error("[backlogmd] Failed to edit task:", err);
      alert("Failed to edit task");
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => (
          <Column
            key={col.id}
            title={col.title}
            icon={col.icon}
            color={col.color}
            items={byStatus[col.id]}
            onAdd={col.id === "plan" ? () => setShowAddModal(true) : undefined}
            onAddTask={col.id === "plan" ? () => setShowAddPlanModal(true) : undefined}
            onItemSelect={setSelectedItem}
          />
        ))}
      </div>
      {showAddModal && (
        <AddWorkModal onClose={() => setShowAddModal(false)} onSubmit={handleAddWork} />
      )}
      {showAddPlanModal && (
        <AddPlanModal onClose={() => setShowAddPlanModal(false)} onSubmit={handleAddPlan} />
      )}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onTaskStatusChange={updateTaskStatus}
          onTaskDelete={deleteTask}
          onItemDelete={() => {
            if (confirm(`Delete item "${selectedItem.name}" and all its tasks?`)) {
              deleteItem(selectedItem.slug);
              setSelectedItem(null);
            }
          }}
          onItemReset={() => {
            if (confirm(`Reset all tasks in "${selectedItem.name}" to open?`)) {
              resetItemTasks(selectedItem.slug);
            }
          }}
          onTaskEdit={(taskSource) => setEditingTask(taskSource)}
          pendingTasks={pendingTasks}
        />
      )}
      {editingTask && (
        <EditTaskModal
          taskSource={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleEditTask}
        />
      )}
    </>
  );
}
