const colorMap: Record<string, string> = {
  open: "bg-badge-todo-bg text-badge-todo-text",
  block: "bg-red-100 text-red-700",
  "in-progress": "bg-badge-wip-bg text-badge-wip-text",
  done: "bg-badge-done-bg text-badge-done-text",
};

const labelMap: Record<string, string> = {
  open: "Open",
  block: "Blocked",
  "in-progress": "In Progress",
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
