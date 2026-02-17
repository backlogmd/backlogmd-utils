/**
 * In-memory registry of workers that have reported to the server.
 * Workers are not created by the server; they register by calling the report API.
 */

const MAX_WORKER_LOGS = 200;
const WORKER_LOGS_TAIL = 100;

export interface WorkerReportBody {
  name?: string;
  role?: string;
  status?: string;
  taskId?: string;
  itemId?: string;
  taskTitle?: string;
  log?: string;
}

export interface WorkerState {
  name: string;
  role: string;
  status: string;
  taskId?: string;
  taskTitle?: string;
  lastLogs: string[];
  lastSeen: string;
}

export type BroadcastWorkerUpdate = (payload: WorkerReportBody) => void;

/**
 * Registry of workers known to the server via POST /api/workers/report.
 * Use getAll() for list_workers and API; use report() from the report endpoint.
 */
export class WorkerRegistry {
  private states = new Map<string, WorkerState>();
  private broadcast: BroadcastWorkerUpdate;

  constructor(broadcast: BroadcastWorkerUpdate) {
    this.broadcast = broadcast;
  }

  report(body: WorkerReportBody): WorkerState {
    const name = (body.name ?? "worker").trim() || "worker";
    const role = (body.role ?? "").trim() || "worker";
    const key = `${name}:${role}`;
    const now = new Date().toISOString();

    let state = this.states.get(key);
    if (!state) {
      state = {
        name,
        role,
        status: "idle",
        lastLogs: [],
        lastSeen: now,
      };
      this.states.set(key, state);
    }

    state.lastSeen = now;
    if (body.status !== undefined) state.status = body.status;
    if (body.taskId !== undefined) state.taskId = body.taskId;
    if (body.taskTitle !== undefined) state.taskTitle = body.taskTitle;
    if (body.log !== undefined) {
      state.lastLogs.push(body.log);
      if (state.lastLogs.length > MAX_WORKER_LOGS) {
        state.lastLogs = state.lastLogs.slice(-WORKER_LOGS_TAIL);
      }
    }

    this.broadcast(body);
    return state;
  }

  getAll(): WorkerState[] {
    return Array.from(this.states.values());
  }
}
