export function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  if (total === 0) return null;
  const percent = Math.round((completed / total) * 100);

  return (
    <div className="mt-1">
      <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
        <span>
          {completed}/{total} tasks
        </span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="w-full bg-progress-track rounded-full h-1.5">
        <div
          className="bg-progress h-1.5 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
