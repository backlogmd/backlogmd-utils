import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import type { DisplayItem } from "./Board";

export function ItemCard({
  item,
  onClick,
}: {
  item: DisplayItem;
  onClick: () => void;
}) {
  const completed = item.tasks.filter((t) => t.status === "done").length;

  return (
    <article
      className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="font-medium text-sm text-slate-900 leading-snug">{item.name}</h3>
        <StatusBadge status={item.status} />
      </div>
      {item.type && (
        <span
          className={`inline-block mb-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${
            {
              feat: "bg-blue-100 text-blue-700",
              fix: "bg-red-100 text-red-700",
              refactor: "bg-amber-100 text-amber-700",
              chore: "bg-slate-100 text-slate-600",
            }[item.type] ?? "bg-slate-100 text-slate-600"
          }`}
        >
          {item.type}
        </span>
      )}
      <ProgressBar completed={completed} total={item.tasks.length} />
    </article>
  );
}
