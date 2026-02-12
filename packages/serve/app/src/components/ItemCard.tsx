import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import type { DisplayItem } from "./Board";

export function ItemCard({ item }: { item: DisplayItem }) {
  const completed = item.tasks.filter((t) => t.status === "done").length;

  return (
    <article className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="font-medium text-sm text-slate-900 leading-snug">{item.name}</h3>
        <StatusBadge status={item.status} />
      </div>
      <ProgressBar completed={completed} total={item.tasks.length} />
    </article>
  );
}
