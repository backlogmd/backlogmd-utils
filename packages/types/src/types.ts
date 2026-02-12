// ─── Enums / Union types ─────────────────────────────────────────────

/**
 * Valid task statuses per SPEC v2.
 * Flow: open → in-progress → done. Use "block" when a task is blocked.
 */
export type TaskStatus = "open" | "block" | "in-progress" | "done";

/**
 * Derived item status, computed from its tasks.
 * Not stored in files — backlog.md and index.md have no status fields in SPEC v2.
 */
export type ItemStatus = "open" | "in-progress" | "done";

/**
 * Conventional Commits type extracted from an item slug.
 * Optional — slugs without a type segment are valid.
 */
export type ItemType = "feat" | "fix" | "refactor" | "chore";

// ─── Model interfaces ───────────────────────────────────────────────

/**
 * A backlog entry parsed from backlog.md.
 *
 * SPEC v2 format: `- [<item-slug>](work/<item-slug>/index.md)`
 */
export interface BacklogEntry {
  /** The item slug, e.g. "001-feat-project-foundation" */
  slug: string;
  /** Conventional Commits type extracted from the slug, or null if absent */
  type: ItemType | null;
  /** Source file path relative to .backlogmd/ */
  source: string;
}

/**
 * An item folder parsed from work/<slug>/index.md.
 *
 * SPEC v2 format: bullet list of task file links.
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
 * SPEC v2 task format uses HTML comment sections with a fenced code block
 * for metadata (Task, Status, Priority, DependsOn).
 */
export interface Task {
  /** Task name from the metadata block */
  name: string;
  /** Current task status */
  status: TaskStatus;
  /** Priority number, e.g. "001" */
  priority: string;
  /** Task slug derived from filename */
  slug: string;
  /** Parent item slug */
  itemSlug: string;
  /** Dependency task slugs or relative paths */
  dependsOn: string[];
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
  /** Backlog entries from backlog.md (ordered by priority) */
  entries: BacklogEntry[];
  /** Item folders from work/ */
  items: ItemFolder[];
  /** All tasks parsed from task files */
  tasks: Task[];
  /** Validation results */
  validation: {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  };
}
