export type {
  BacklogEntry,
  ItemFolder,
  TaskRef,
  Task,
  AcceptanceCriterion,
  ValidationIssue,
  BacklogOutput,
  ItemStatus,
  TaskStatus,
} from "./types.js";

export { deriveItemStatus } from "./derive.js";
export type { CrossLinkResult } from "./cross-link.js";
export { buildBacklogOutput, serializeOutput, writeOutput } from "./emit.js";
