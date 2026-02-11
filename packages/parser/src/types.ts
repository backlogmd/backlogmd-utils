export type FeatureStatus = "todo" | "in-progress" | "done";

export type FeatureFolderStatus = "open" | "archived";

export type TaskStatus = "todo" | "in-progress" | "ready-to-review" | "ready-to-test" | "done";

export interface RoadmapFeature {
  id: string;
  name: string;
  status: FeatureStatus;
  statusDerived: FeatureStatus | null;
  featureSlug: string | null;
  description: string;
  taskRefs: string[];
  source: string;
}

export interface FeatureFolder {
  slug: string;
  name: string;
  status: FeatureFolderStatus;
  goal: string;
  tasks: TaskStub[];
  source: string;
}

export interface TaskStub {
  priority: string;
  name: string;
  fileName: string;
  status: TaskStatus;
  owner: string | null;
  dependsOn: string[];
}

export interface Task {
  id: string;
  slug: string;
  name: string;
  status: TaskStatus;
  priority: string;
  owner: string | null;
  featureId: string;
  dependsOn: string[];
  blocks: string[];
  description: string;
  acceptanceCriteria: AcceptanceCriterion[];
  source: string;
}

export interface AcceptanceCriterion {
  text: string;
  checked: boolean;
}

export interface ValidationIssue {
  code: string;
  message: string;
  source: string;
}

export interface BacklogOutput {
  protocol: string;
  generatedAt: string;
  rootDir: string;
  features: RoadmapFeature[];
  featureFolders: FeatureFolder[];
  tasks: Task[];
  validation: {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  };
}
