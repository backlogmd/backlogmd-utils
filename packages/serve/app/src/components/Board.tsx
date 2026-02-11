import { Column } from "./Column";

interface Item {
  name: string;
  description: string;
  status: string;
  statusDerived: string | null;
  itemSlug: string | null;
}

interface ItemFolder {
  slug: string;
  tasks: { status: string }[];
}

interface BacklogData {
  items: Item[];
  itemFolders: ItemFolder[];
}

const columns = [
  { id: "todo", title: "To Do", color: "bg-col-todo", icon: "○" },
  { id: "in-progress", title: "In Progress", color: "bg-col-inprogress", icon: "◐" },
  { id: "done", title: "Done", color: "bg-col-done", icon: "●" },
] as const;

export function Board({ data }: { data: BacklogData }) {
  const byStatus: Record<string, Item[]> = {
    todo: [],
    "in-progress": [],
    done: [],
  };

  for (const item of data.items) {
    const status = item.statusDerived ?? item.status;
    if (byStatus[status]) {
      byStatus[status].push(item);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((col) => (
        <Column
          key={col.id}
          title={col.title}
          icon={col.icon}
          color={col.color}
          items={byStatus[col.id]}
          itemFolders={data.itemFolders}
        />
      ))}
    </div>
  );
}
