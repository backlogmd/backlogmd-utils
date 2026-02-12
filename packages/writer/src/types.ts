import type { BacklogOutput } from "@backlogmd/types";

/**
 * A single surgical edit within a file.
 * Replaces `original` text with `replacement` text.
 */
export interface FilePatch {
  /** File path relative to the .backlogmd/ root, e.g. "work/my-feature/003-task.md" */
  filePath: string;
  /** The exact text being replaced */
  original: string;
  /** The new text to insert */
  replacement: string;
  /** Human-readable description, e.g. "task status: open → in-progress" */
  description: string;
}

/**
 * The result of a mutation: a set of file patches plus
 * snapshots of the model before and after the mutation.
 */
export interface Changeset {
  /** Ordered list of file patches to apply */
  patches: FilePatch[];
  /** Snapshot of the model before the mutation */
  modelBefore: BacklogOutput;
  /** Snapshot of the model after the mutation (with all cascading changes) */
  modelAfter: BacklogOutput;
}

/**
 * Map of relative file paths → raw file contents.
 * Used as an in-memory cache of the .backlogmd/ directory.
 */
export type FileCache = Map<string, string>;
