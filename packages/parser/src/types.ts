/**
 * Re-export all types from @backlogmd/types.
 *
 * This file preserves backward compatibility — internal parser modules
 * import from "./types.js" and external consumers import from
 * "@backlogmd/parser", both of which resolve to @backlogmd/types.
 */
export type {
  ItemStatus,
<<<<<<< HEAD
=======
  ItemType,
>>>>>>> 8c17d17 (v0.2)
  TaskStatus,
  BacklogEntry,
  ItemFolder,
  TaskRef,
  Task,
  AcceptanceCriterion,
  ValidationIssue,
  BacklogOutput,
} from "@backlogmd/types";
