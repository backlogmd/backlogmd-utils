import { ItemCard } from "./ItemCard";
import type { DisplayItem } from "./Board";

export function Column({
  title,
  icon,
  color,
  items,
  onAdd,
}: {
  title: string;
  icon: string;
  color: string;
  items: DisplayItem[];
  onAdd?: () => void;
}) {
  return (
    <section className={`${color} rounded-xl p-5 min-h-48`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        <span className="ml-auto text-xs font-medium text-slate-400 bg-white/60 rounded-full px-2 py-0.5">
          {items.length}
        </span>
        {onAdd && (
          <button
            onClick={onAdd}
            className="ml-1 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-600 hover:bg-white/80 transition-colors text-lg leading-none"
            aria-label="Add work"
          >
            +
          </button>
        )}
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">No items</p>
        ) : (
          items.map((item) => (
            <ItemCard key={item.slug} item={item} />
          ))
        )}
      </div>
    </section>
  );
}
