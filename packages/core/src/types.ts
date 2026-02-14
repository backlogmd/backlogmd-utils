import type { Manifest, TaskStatus, ItemType } from "@backlogmd/types";

export type { Manifest, TaskStatus, ItemType };

export interface CoreOptions {
  rootDir: string;
  autoReconcile?: boolean;
}

export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TaskAddInput {
  title: string;
  tid?: string;
  priority?: number;
  status?: TaskStatus;
  description?: string;
}

export interface ItemAddInput {
  title: string;
  type?: ItemType;
}

export interface TaskContent {
  title: string;
  description: string;
  acceptanceCriteria: { text: string; checked: boolean }[];
}
