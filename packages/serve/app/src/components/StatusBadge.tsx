const colorMap: Record<string, string> = {
  todo: "bg-badge-todo-bg text-badge-todo-text",
  "in-progress": "bg-badge-wip-bg text-badge-wip-text",
  done: "bg-badge-done-bg text-badge-done-text",
};

const labelMap: Record<string, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

export function StatusBadge({ status }: { status: string }) {
  const colors = colorMap[status] ?? colorMap.todo;
  const label = labelMap[status] ?? status;
  return (
    <span
      className={`shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md ${colors}`}
    >
      {label}
    </span>
  );
}
