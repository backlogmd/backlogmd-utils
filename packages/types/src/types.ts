// ─── Enums / Union types ─────────────────────────────────────────────

/**
 * Valid task statuses per SPEC v3.
 * Flow: plan → open → reserved → ip → done (or ip → review → done if h: true)
 * Any active state → block → ip or open
 */
export type TaskStatus =
  | "plan"
  | "open"
  | "reserved"
  | "ip"
  | "review"
  | "block"
  | "done";

/**
 * Derived item status, computed from its tasks.
 * Not stored in files — backlog.md and index.md have no status fields.
 */
export type ItemStatus = "open" | "in-progress" | "done";

/**
 * Item status in the manifest (distinct from derived status).
 */
export type ManifestItemStatus = "open" | "archived";

/**
 * Conventional Commits type extracted from an item slug.
 * Optional — slugs without a type segment are valid.
 */
export type ItemType = "feat" | "fix" | "refactor" | "chore";

// ─── Model interfaces ───────────────────────────────────────────────

/**
 * A backlog entry parsed from backlog.md.
 *
 * SPEC v3 format: `- [<item-id>-<slug>](work/<item-id>-<slug>/index.md)`
 */
export interface BacklogEntry {
  /** The item slug, e.g. "001-chore-project-foundation" */
  slug: string;
  /** Conventional Commits type extracted from the slug, or null if absent */
  type: ItemType | null;
  /** Source file path relative to .backlogmd/ */
  source: string;
}

/**
 * An item folder parsed from work/<slug>/index.md.
 *
 * SPEC v3 format: bullet list of task file links.
 */
export interface ItemFolder {
  /** The item slug (matches directory name) */
  slug: string;
  /** Conventional Commits type extracted from the slug, or null if absent */
  type: ItemType | null;
  /** Task references parsed from the bullet list */
  tasks: TaskRef[];
  /** Source file path relative to .backlogmd/ */
  source: string;
}

/**
 * A task reference from an item's index.md bullet list.
 */
export interface TaskRef {
  /** Task slug from link text, e.g. "001-task-slug" */
  slug: string;
  /** File name from link URL, e.g. "001-task-slug.md" */
  fileName: string;
}

/**
 * A full task parsed from its markdown file.
 *
 * SPEC v3 task format uses HTML comment markers with a YAML code block
 * for metadata (t, s, p, dep, a, h, expiresAt).
 */
export interface Task {
  /** Task title (t field) */
  name: string;
  /** Current task status (s field) */
  status: TaskStatus;
  /** Priority within item — lower = higher priority (p field) */
  priority: number;
  /** Task ID derived from filename, e.g. "001" */
  tid: string;
  /** Task slug derived from filename, e.g. "setup-repo" */
  slug: string;
  /** Parent item slug */
  itemSlug: string;
  /** Dependency task IDs within the same item (dep field) */
  dependsOn: string[];
  /** Agent/assignee ID, empty string if unassigned (a field) */
  agent: string;
  /** Whether human review is required before done (h field) */
  humanReview: boolean;
  /** ISO 8601 timestamp for reservation expiry, or null (expiresAt field) */
  expiresAt: string | null;
  /** Description content from the DESCRIPTION section */
  description: string;
  /** Acceptance criteria checkboxes */
  acceptanceCriteria: AcceptanceCriterion[];
  /** Source file path relative to .backlogmd/ */
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

// ─── Manifest types ─────────────────────────────────────────────────

export interface ManifestTask {
  tid: string;
  slug: string;
  file: string;
  t: string;
  s: TaskStatus;
  p: number;
  dep: string[];
  a: string;
  h: boolean;
  expiresAt: string | null;
}

export interface ManifestItem {
  id: string;
  slug: string;
  path: string;
  status: ManifestItemStatus;
  updated: string;
  tasks: ManifestTask[];
}

export interface Manifest {
  specVersion: string;
  updatedAt: string;
  openItemCount: number;
  items: ManifestItem[];
}

/**
 * The canonical output of the backlog parser.
 */
export interface BacklogOutput {
  /** Protocol version identifier */
  protocol: string;
  /** ISO timestamp of generation */
  generatedAt: string;
  /** Absolute path to the .backlogmd/ directory */
  rootDir: string;
  /** Backlog entries from backlog.md (ordered by item-id) */
  entries: BacklogEntry[];
  /** Item folders from work/ */
  items: ItemFolder[];
  /** All tasks parsed from task files */
  tasks: Task[];
  /** Manifest data if manifest.json exists */
  manifest: Manifest | null;
  /** Validation results */
  validation: {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  };
}
