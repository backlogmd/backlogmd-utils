import type { ServerResponse } from "node:http";
import type { Backlogmd } from "@backlogmd/core";

export type { WorkerReportBody, WorkerState } from "./workerRegistry.js";
import type { WorkerReportBody, WorkerState } from "./workerRegistry.js";
import type { AssignmentMessage } from "./assignmentQueue.js";

export interface AppContext {
    backlogDir: string;
    /** Single source of truth for backlog state; all reads/writes go through this. */
    backlogmd: Backlogmd;
    notifyClients: () => void;
    /** Broadcast a worker update to all SSE clients. */
    broadcastWorkerUpdate: (payload: WorkerReportBody) => void;
    /** Broadcast status (e.g. worker count) to all SSE clients. */
    broadcastStatus: () => void;
    /** Update worker state and return current state (for report endpoint). */
    reportWorker: (body: WorkerReportBody) => WorkerState;
    /** Get current state of all known workers. */
    getWorkerStates: () => WorkerState[];
    /** Enqueue an assignment for a worker to consume via poll. */
    enqueueAssignment: (msg: AssignmentMessage) => void;
    /** Dequeue and return the next assignment (available work) for this worker, or null. */
    dequeueAssignment: (workerId: string) => AssignmentMessage | null;
    /** List all assignments for this worker without removing them. */
    listAssignments: (workerId: string) => AssignmentMessage[];
    addEventClient: (res: ServerResponse) => void;
    removeEventClient: (res: ServerResponse) => void;
    /** Claim an item (e.g. when in-progress but item has no tasks to set). Cleared when worker reports idle. */
    setClaimedItem: (workerKey: string, itemId: string | null) => void;
    /** Whether this item is currently claimed by any worker (exclude from assignments). */
    isItemClaimed: (itemId: string) => boolean;
    /** Returns a promise that resolves when work may be available (assign or backlog change). In-process workers wait on this instead of polling. */
    getWorkTrigger: () => Promise<void>;
    /** Signal in-process workers to check for work. Called after assign and on backlog change. */
    triggerWorkAvailable: () => void;
}
