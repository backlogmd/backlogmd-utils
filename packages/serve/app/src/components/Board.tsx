import { useState, useEffect } from "react";
import type { BacklogStateDto, TaskDto, WorkItemDto } from "@backlogmd/types";
import { Column } from "./Column";
import { AddWorkModal } from "./AddWorkModal";
import { ItemDetailModal } from "./ItemDetailModal";
import { useTaskStatusUpdate } from "../hooks/useTaskStatusUpdate";

/** Derive an item's column from task statuses when entry has no status (SPEC v4). */
function deriveStatusFromTasks(taskStatuses: string[]): string {
  if (taskStatuses.length === 0) return "open";
  if (taskStatuses.every((s) => s === "done")) return "done";
  if (taskStatuses.every((s) => s === "open" || s === "plan")) return "open";
  return "in-progress";
}

/** Map item status to column id; claimed shows in In Progress. */
function statusToColumn(status: string): string {
  if (status === "done") return "done";
  if (status === "open" || status === "plan") return "open";
  return "in-progress";
}

/** Derive display name from slug when work item has no name (SPEC v4). */
function slugToName(slug: string): string {
  const cleaned = slug.replace(/^\d+-(?:feat|fix|refactor|chore)-/, "").replace(/^\d+-/, "");
  return cleaned.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Extract Conventional Commits type from slug, or null if absent. */
function slugToType(slug: string): string | null {
  const match = slug.match(/^\d+-(feat|fix|refactor|chore)-/);
  return match ? match[1] : null;
}

/** Item id from slug (leading 3+ digits). */
function parseItemId(slug: string): string | undefined {
  const m = slug.match(/^(\d{3,})/);
  return m ? m[1] : undefined;
}

/** View model for a work item card/detail — built from WorkItemDto. */
export interface DisplayItem {
  id?: string;
  slug: string;
  name: string;
  type: string | null;
  status: string;
  assignee?: string;
  tasks: TaskDto[];
}

const columns = [
  { id: "open", title: "Open", color: "bg-col-todo", icon: "○" },
  { id: "in-progress", title: "In Progress", color: "bg-col-inprogress", icon: "◐" },
  { id: "done", title: "Done", color: "bg-col-done", icon: "●" },
] as const;

export function Board({ data, searchQuery = "" }: { data: BacklogStateDto; searchQuery?: string }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DisplayItem | null>(null);
  const { updateTaskStatus, pendingTasks } = useTaskStatusUpdate();

  // Build display items from v4 source of truth (data.work)
  const displayItems: DisplayItem[] = data.work.map((w: WorkItemDto): DisplayItem => ({
    id: parseItemId(w.slug),
    slug: w.slug,
    name: w.name?.trim() ? w.name : slugToName(w.slug),
    type: w.type ?? slugToType(w.slug),
    status: w.status,
    assignee: w.assignee,
    tasks: w.tasks,
  }));

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
    open: [],
    "in-progress": [],
    done: [],
  };

  for (const item of filtered) {
    const col = statusToColumn(item.status);
    if (byStatus[col]) {
      byStatus[col].push(item);
    }
  }

  const handleAddWork = (content: string) => {
    console.log("[backlogmd] Submitted work:\n", content);
    setShowAddModal(false);
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
            onAdd={col.id === "open" ? () => setShowAddModal(true) : undefined}
            onItemSelect={setSelectedItem}
          />
        ))}
      </div>
      {showAddModal && (
        <AddWorkModal onClose={() => setShowAddModal(false)} onSubmit={handleAddWork} />
      )}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onTaskStatusChange={updateTaskStatus}
          pendingTasks={pendingTasks}
        />
      )}
    </>
  );
}
