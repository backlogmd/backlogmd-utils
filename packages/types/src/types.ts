// ─── Enums / Union types ─────────────────────────────────────────────

/**
 * Valid task statuses per SPEC v4.
 * plan → open → in-progress → review | done; block from any active state.
 */
export type TaskStatus = "plan" | "open" | "in-progress" | "review" | "block" | "done";

/**
 * Item-level status from index.md (SPEC v4).
 * plan | open | claimed | in-progress | done
 */
export type ItemStatus = "plan" | "open" | "claimed" | "in-progress" | "done";

/**
 * Conventional Commits type extracted from an item slug.
 * Optional — slugs without a type segment are valid.
 */
export type ItemType = "feat" | "fix" | "refactor" | "chore";

// ─── Model interfaces ───────────────────────────────────────────────

/**
 * A work item entry (derived from work/ discovery).
 */
export interface BacklogEntry {
    /** Item id: leading zero-padded digits from slug (e.g. "001") */
    id?: string;
    /** The item slug, e.g. "001-feat-project-foundation" */
    slug: string;
    /** Conventional Commits type extracted from the slug, or null if absent */
    type: ItemType | null;
    /** Item status from index (SPEC v4) or undefined */
    status?: ItemStatus;
    /** Item assignee/agent id (SPEC v4); required when status is claimed; empty when open or done */
    assignee?: string;
    /** Source file path relative to root (e.g. work/<slug>/index.md) */
    source: string;
}

/**
 * An item folder parsed from work/<slug>/index.md.
 *
 * SPEC v4: index has METADATA (work, status), no task list; tasks discovered by listing dir.
 * Legacy: index may have a bullet list of task file links (v2).
 */
export interface ItemFolder {
    /** Item id: leading zero-padded digits from slug (e.g. "001") */
    id?: string;
    /** The item slug (matches directory name) */
    slug: string;
    /** Display title from METADATA work: (SPEC v4); undefined for legacy format */
    work?: string;
    /** Conventional Commits type extracted from the slug, or null if absent */
    type: ItemType | null;
    /** Item status from index (SPEC v4) or undefined if not present */
    status?: ItemStatus;
    /** Item assignee/agent id (SPEC v4); non-empty when status is claimed */
    assignee?: string;
    /** Task refs: from directory listing (v4) or from index bullet list (v2) */
    tasks: TaskRef[];
    /** Source file path relative to root (e.g. work/<slug>/index.md) */
    source: string;
}

/**
 * A task reference: from directory listing (v4 <tid>-<slug>.md) or from index.md bullet list (v2).
 */
export interface TaskRef {
    /** Task slug, e.g. "001-task-slug" (from filename or link text) */
    slug: string;
    /** File name, e.g. "001-task-slug.md" */
    fileName: string;
}

/**
 * A full task parsed from its markdown file.
 *
 * SPEC v4: METADATA yaml (task, status, priority, dep, assignee, requiresHumanReview, expiresAt).
 * Legacy: v2 HTML comment / YAML frontmatter (Task, Status, Priority, DependsOn).
 */
export interface Task {
    /** Task name from the metadata block */
    name: string;
    /** Current task status */
    status: TaskStatus;
    /** Priority (number or string), lower = higher priority */
    priority: string;
    /** Task slug derived from filename */
    slug: string;
    /** Parent item slug */
    itemSlug: string;
    /** Dependency paths relative to .backlogmd/ (SPEC v4 dep) or slugs (legacy) */
    dependsOn: string[];
    /** Description content from the DESCRIPTION section */
    description: string;
    /** Acceptance criteria checkboxes */
    acceptanceCriteria: AcceptanceCriterion[];
    /** Source file path relative to root (e.g. work/<slug>/001-task.md) */
    source: string;
    /** Optional feedback file for this task (e.g. 001-setup-feedback.md), when present */
    feedback?: TaskFeedback;
    /** Assignee/agent id (SPEC v4); empty if unassigned */
    assignee?: string;
    /** Human review required before done (SPEC v4) */
    requiresHumanReview?: boolean;
    /** Reservation expiry ISO 8601 (SPEC v4); null if not set */
    expiresAt?: string | null;
}

export interface AcceptanceCriterion {
    text: string;
    checked: boolean;
}

/**
 * Optional feedback file for a task (new SPEC).
 * Convention: task file "001-setup.md" can have "001-setup-feedback.md" in the same directory.
 */
export interface TaskFeedback {
    /** Source file path relative to root (e.g. work/<slug>/001-setup-feedback.md) */
    source: string;
    /** Raw markdown content of the feedback file */
    content: string;
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
    /** Absolute path to the root directory */
    rootDir: string;
    /** Work item entries (derived from work/ discovery, ordered by folder order) */
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

/**
 * A work item in the document: one item from work/ with its task refs and source.
 */
export interface WorkItem {
    /** The item slug (matches directory name) */
    slug: string;
    /** Display title from METADATA work: (SPEC v4); undefined for legacy */
    name?: string;
    /** Conventional Commits type extracted from the slug, or null if absent */
    type: ItemType | null;
    /** Task references parsed from the item's index.md */
    tasks: TaskRef[];
    /** Source file path relative to root (e.g. work/<slug>/index.md) */
    source: string;
    /** Item-level assignee (SPEC v4 item index); when set, work is claimed by this agent */
    assignee?: string;
}

/**
 * Root document type for the backlog: work items and their tasks.
 * Use this when you need the structure of work and tasks as a single document.
 */
export interface BacklogmdDocument {
    protocol: string;
    generatedAt: string;
    rootDir: string;
    work: WorkItem[];
    tasks: Task[];
    /** Default work directory (project root); used to set workDir on each WorkItemDto when present. */
    workDir?: string;
    validation: {
        errors: ValidationIssue[];
        warnings: ValidationIssue[];
    };
}

export type WorkItemStatus = "plan" | "open" | "claimed" | "in-progress" | "done";

export interface TaskDto {
    name: string;
    status: TaskStatus;
    priority: string;
    slug: string;
    itemSlug: string;
    /** Source file path relative to root; use for API taskId in PATCH/DELETE. */
    source?: string;
    dependsOn: string[];
    description: string;
    acceptanceCriteria: AcceptanceCriterion[];
    feedback?: TaskFeedback;
    assignee?: string;
    requiresHumanReview?: boolean;
    expiresAt?: string | null;
}

export interface WorkItemDto {
    slug: string;
    /** Display title from item index work: metadata; use slug-derived name if absent */
    name?: string;
    type: ItemType | null;
    status: WorkItemStatus;
    tasks: TaskDto[];
    /** Item-level assignee (from item index); when set, work is claimed by this agent */
    assignee?: string;
    /**
     * Absolute path of the directory to run work in (project root today; worktree path in future).
     * Enables workers to use a different directory than the server when using worktrees.
     */
    workDir?: string;
}

/**
 * DTO for the backlog document used by the server and API.
 * Server and clients use only this and WorkItemDto / TaskDto; no parser/writer types.
 */
export interface BacklogStateDto {
    protocol: string;
    generatedAt: string;
    rootDir: string;
    validation: {
        errors: ValidationIssue[];
        warnings: ValidationIssue[];
    };
    work: WorkItemDto[];
}
