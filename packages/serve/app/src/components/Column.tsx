import { ItemCard } from "./ItemCard";

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

export function Column({
  title,
  icon,
  color,
  items,
  itemFolders,
}: {
  title: string;
  icon: string;
  color: string;
  items: Item[];
  itemFolders: ItemFolder[];
}) {
  return (
    <section className={`${color} rounded-xl p-5 min-h-48`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        <span className="ml-auto text-xs font-medium text-slate-400 bg-white/60 rounded-full px-2 py-0.5">
          {items.length}
        </span>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">No items</p>
        ) : (
          items.map((item) => (
            <ItemCard key={item.itemSlug ?? item.name} item={item} itemFolders={itemFolders} />
          ))
        )}
      </div>
    </section>
  );
}
