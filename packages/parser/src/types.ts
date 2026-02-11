export type ItemType = "feature" | "bugfix" | "refactor" | "chore";

export type ItemStatus = "todo" | "in-progress" | "done";

export type ItemFolderStatus = "open" | "archived";

export type TaskStatus = "todo" | "in-progress" | "ready-to-review" | "ready-to-test" | "done";

export interface RoadmapItem {
  id: string;
  name: string;
  type: ItemType;
  status: ItemStatus;
  statusDerived: ItemStatus | null;
  itemSlug: string | null;
  description: string;
  taskRefs: string[];
  source: string;
}

export interface ItemFolder {
  slug: string;
  name: string;
  type: ItemType;
  status: ItemFolderStatus;
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
  itemId: string;
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
  items: RoadmapItem[];
  itemFolders: ItemFolder[];
  tasks: Task[];
  validation: {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  };
}
