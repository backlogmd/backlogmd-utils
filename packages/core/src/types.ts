import type { TaskStatus, ItemType } from "@backlogmd/types";

export type { TaskStatus, ItemType };

export interface CoreOptions {
    rootDir: string;
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
    /** Main description body for the work item (shown in DESCRIPTION section). */
    description?: string;
    /** Extra context bullets or notes (shown in CONTEXT section). */
    context?: string;
}

export interface TaskContent {
    title: string;
    description: string;
    acceptanceCriteria: { text: string; checked: boolean }[];
}

export interface BacklogmdOptions {
    rootDir: string;
}
