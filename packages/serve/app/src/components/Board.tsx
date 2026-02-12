import { useState } from "react";
import { Column } from "./Column";
import { AddWorkModal } from "./AddWorkModal";

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
  priority: string;
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
  return "in-progress";
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
  { id: "open", title: "Open", color: "bg-col-todo", icon: "○" },
  { id: "in-progress", title: "In Progress", color: "bg-col-inprogress", icon: "◐" },
  { id: "done", title: "Done", color: "bg-col-done", icon: "●" },
] as const;

export function Board({ data, searchQuery = "" }: { data: BacklogData; searchQuery?: string }) {
  const [showAddModal, setShowAddModal] = useState(false);

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
    if (byStatus[item.status]) {
      byStatus[item.status].push(item);
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
          />
        ))}
      </div>
      {showAddModal && (
        <AddWorkModal onClose={() => setShowAddModal(false)} onSubmit={handleAddWork} />
      )}
    </>
  );
}
