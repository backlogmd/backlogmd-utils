/** Shared type badge colors for feat/fix/refactor/chore (ItemCard, ItemDetailModal). */
export const TYPE_COLOR_MAP: Record<string, string> = {
  feat: "bg-blue-100 text-blue-700",
  fix: "bg-red-100 text-red-700",
  refactor: "bg-amber-100 text-amber-700",
  chore: "bg-slate-100 text-slate-600",
};

export const WORK_ITEM_TEMPLATE = `
<!-- METADATA -->

\`\`\`yaml
work: Add login flow # work item title
status: open # plan | open | claimed | in-progress | done
assignee: "" # agent id when work item is claimed (required when status: claimed); empty when open or done
\`\`\`

<!-- DESCRIPTION -->

<optional item description>

<!-- CONTEXT -->`;
