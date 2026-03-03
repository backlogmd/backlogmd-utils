/**
 * In-memory queue of work assignments for workers.
 * POST /api/workers/assign enqueues; GET /api/workers/assignments returns the list for a worker.
 */

export interface AssignmentMessage {
  workerId: string;
  taskId?: string;
  itemId?: string;
}

export class AssignmentQueue {
  private queue: AssignmentMessage[] = [];

  enqueue(msg: AssignmentMessage): void {
    this.queue.push(msg);
  }

  /**
   * Remove and return the first assignment for the given worker, or null.
   */
  dequeueForWorker(workerId: string): AssignmentMessage | null {
    const idx = this.queue.findIndex((m) => m.workerId === workerId);
    if (idx === -1) return null;
    const [msg] = this.queue.splice(idx, 1);
    return msg;
  }

  /**
   * Return all assignments for the given worker without removing them.
   */
  listForWorker(workerId: string): AssignmentMessage[] {
    return this.queue.filter((m) => m.workerId === workerId);
  }
}
