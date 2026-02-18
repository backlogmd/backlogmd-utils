import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { TYPE_COLOR_MAP } from "../constants";
import type { DisplayItem } from "./Board";

export function ItemCard({ item, onClick }: { item: DisplayItem; onClick: () => void }) {
    const completed = item.tasks.filter((t) => t.status === "done").length;
    const taskLabel = item.tasks.length === 1 ? "1 task" : `${item.tasks.length} tasks`;

    return (
        <article
            className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            onClick={onClick}
            role="button"
            tabIndex={0}
            aria-label={`Open ${item.name}, ${taskLabel}`}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3
                    className="font-medium text-sm text-slate-900 leading-snug flex items-center gap-1.5 min-w-0"
                    title={item.name}
                >
                    {item.id && (
                        <span className="shrink-0 text-slate-400 font-normal text-xs">
                            #{item.id}
                        </span>
                    )}
                    <span className="truncate" title={item.name}>
                        {item.name}
                    </span>
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                    {item.assignee && (
                        <span
                            className="text-[10px] text-slate-500 truncate max-w-[80px]"
                            title={`Assigned to ${item.assignee}`}
                        >
                            {item.assignee}
                        </span>
                    )}
                    <StatusBadge status={item.status} />
                </div>
            </div>
            {item.type && (
                <span
                    className={`inline-block mb-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${TYPE_COLOR_MAP[item.type] ?? TYPE_COLOR_MAP.chore}`}
                >
                    {item.type}
                </span>
            )}
            <ProgressBar completed={completed} total={item.tasks.length} />
        </article>
    );
}
