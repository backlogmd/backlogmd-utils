/**
 * Re-export all types from @backlogmd/types.
 *
 * This file preserves backward compatibility — internal parser modules
 * import from "./types.js" and external consumers import from
 * "@backlogmd/parser", both of which resolve to @backlogmd/types.
 */
export type {
  ItemStatus,
  ItemType,
  TaskStatus,
  ManifestItemStatus,
  BacklogEntry,
  ItemFolder,
  TaskRef,
  Task,
  AcceptanceCriterion,
  ValidationIssue,
  ManifestTask,
  ManifestItem,
  Manifest,
  BacklogOutput,
} from "@backlogmd/types";
