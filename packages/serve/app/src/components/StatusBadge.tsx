const colorMap: Record<string, string> = {
  plan: "bg-slate-100 text-slate-600",
  open: "bg-badge-todo-bg text-badge-todo-text",
  claimed: "bg-violet-100 text-violet-700",
  block: "bg-red-100 text-red-700",
  "in-progress": "bg-badge-wip-bg text-badge-wip-text",
  review: "bg-amber-100 text-amber-700",
  done: "bg-badge-done-bg text-badge-done-text",
};

const labelMap: Record<string, string> = {
  plan: "Plan",
  open: "Open",
  claimed: "Claimed",
  block: "Blocked",
  "in-progress": "In Progress",
  review: "Review",
  done: "Done",
};

export function StatusBadge({ status }: { status: string }) {
  const colors = colorMap[status] ?? colorMap.open;
  const label = labelMap[status] ?? status;
  return (
    <span
      className={`shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md ${colors}`}
    >
      {label}
    </span>
  );
}
