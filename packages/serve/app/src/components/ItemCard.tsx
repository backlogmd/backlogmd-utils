import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";

interface Task {
  status: string;
}

interface ItemFolder {
  slug: string;
  tasks: Task[];
}

interface Item {
  name: string;
  description: string;
  status: string;
  statusDerived: string | null;
  itemSlug: string | null;
}

export function ItemCard({ item, itemFolders }: { item: Item; itemFolders: ItemFolder[] }) {
  const folder = itemFolders.find((f) => f.slug === item.itemSlug);
  const tasks = folder?.tasks ?? [];
  const completed = tasks.filter((t) => t.status === "done").length;
  const status = item.statusDerived ?? item.status;

  return (
    <article className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="font-medium text-sm text-slate-900 leading-snug">{item.name}</h3>
        <StatusBadge status={status} />
      </div>
      {item.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      )}
      <ProgressBar completed={completed} total={tasks.length} />
    </article>
  );
}
