import { FeatureCard } from "./FeatureCard";

interface Feature {
  name: string;
  description: string;
  status: string;
  statusDerived: string | null;
  featureSlug: string | null;
}

interface FeatureFolder {
  slug: string;
  tasks: { status: string }[];
}

export function Column({
  title,
  icon,
  color,
  features,
  featureFolders,
}: {
  title: string;
  icon: string;
  color: string;
  features: Feature[];
  featureFolders: FeatureFolder[];
}) {
  return (
    <section className={`${color} rounded-xl p-5 min-h-48`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        <span className="ml-auto text-xs font-medium text-slate-400 bg-white/60 rounded-full px-2 py-0.5">
          {features.length}
        </span>
      </div>
      <div className="space-y-3">
        {features.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">
            No features
          </p>
        ) : (
          features.map((f) => (
            <FeatureCard
              key={f.featureSlug ?? f.name}
              feature={f}
              featureFolders={featureFolders}
            />
          ))
        )}
      </div>
    </section>
  );
}
