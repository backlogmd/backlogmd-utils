import { Column } from "./Column";

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

interface BacklogData {
  features: Feature[];
  featureFolders: FeatureFolder[];
}

const columns = [
  { id: "todo", title: "To Do", color: "bg-col-todo", icon: "○" },
  { id: "in-progress", title: "In Progress", color: "bg-col-inprogress", icon: "◐" },
  { id: "done", title: "Done", color: "bg-col-done", icon: "●" },
] as const;

export function Board({ data }: { data: BacklogData }) {
  const byStatus: Record<string, Feature[]> = {
    todo: [],
    "in-progress": [],
    done: [],
  };

  for (const feature of data.features) {
    const status = feature.statusDerived ?? feature.status;
    if (byStatus[status]) {
      byStatus[status].push(feature);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((col) => (
        <Column
          key={col.id}
          title={col.title}
          icon={col.icon}
          color={col.color}
          features={byStatus[col.id]}
          featureFolders={data.featureFolders}
        />
      ))}
    </div>
  );
}
