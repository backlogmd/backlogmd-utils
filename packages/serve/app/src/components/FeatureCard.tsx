import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";

interface Task {
  status: string;
}

interface FeatureFolder {
  slug: string;
  tasks: Task[];
}

interface Feature {
  name: string;
  description: string;
  status: string;
  statusDerived: string | null;
  featureSlug: string | null;
}

export function FeatureCard({
  feature,
  featureFolders,
}: {
  feature: Feature;
  featureFolders: FeatureFolder[];
}) {
  const folder = featureFolders.find((f) => f.slug === feature.featureSlug);
  const tasks = folder?.tasks ?? [];
  const completed = tasks.filter((t) => t.status === "done").length;
  const status = feature.statusDerived ?? feature.status;

  return (
    <article className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="font-medium text-sm text-slate-900 leading-snug">
          {feature.name}
        </h3>
        <StatusBadge status={status} />
      </div>
      {feature.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
          {feature.description}
        </p>
      )}
      <ProgressBar completed={completed} total={tasks.length} />
    </article>
  );
}
