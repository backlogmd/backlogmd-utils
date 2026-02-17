/**
 * Reports worker status and logs to a backlogmd-serve instance.
 * Fire-and-forget: requests are not awaited so the worker is not blocked.
 */

import http from "node:http";

export interface WorkerReporterOptions {
  name: string;
  role: string;
}

export interface StatusUpdate {
  status: string;
  taskId?: string;
  itemId?: string;
  taskTitle?: string;
}

const REPORT_PATH = "/api/workers/report";

export class WorkerReporter {
  private baseUrl: string;
  private name: string;
  private role: string;

  constructor(serverUrl: string, options: WorkerReporterOptions) {
    const url = new URL(serverUrl);
    url.pathname = url.pathname.replace(/\/$/, "") || "";
    this.baseUrl = url.origin + url.pathname;
    this.name = options.name;
    this.role = options.role;
  }

  /**
   * Report current status (e.g. "idle", "running", "done").
   * Optionally include the task being executed.
   */
  reportStatus(update: StatusUpdate): void {
    this.send({
      name: this.name,
      role: this.role,
      status: update.status,
      taskId: update.taskId,
      itemId: update.itemId,
      taskTitle: update.taskTitle,
    });
  }

  /**
   * Report status and wait for the server to respond (e.g. so backlog is updated before executing).
   * Use for "in-progress" so the server marks the work in-progress before the worker runs it.
   */
  reportStatusAndWait(update: StatusUpdate): Promise<void> {
    return this.sendAndWait({
      name: this.name,
      role: this.role,
      status: update.status,
      taskId: update.taskId,
      itemId: update.itemId,
      taskTitle: update.taskTitle,
    });
  }

  /**
   * Send a single log line (agent output or status message).
   */
  reportLog(line: string): void {
    this.send({
      name: this.name,
      role: this.role,
      log: line,
    });
  }

  private send(body: Record<string, string | undefined>): void {
    const url = `${this.baseUrl}${this.baseUrl.endsWith("/") ? "" : "/"}${REPORT_PATH.replace(/^\//, "")}`;
    const bodyStr = JSON.stringify(body);
    try {
      const u = new URL(url);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port || (u.protocol === "https:" ? 443 : 80),
          path: u.pathname + u.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(bodyStr),
          },
        },
        () => {},
      );
      req.on("error", () => {});
      (req as unknown as { write: (chunk: string) => void; end: () => void }).write(bodyStr);
      (req as unknown as { write: (chunk: string) => void; end: () => void }).end();
    } catch {
      // Ignore
    }
  }

  private sendAndWait(body: Record<string, string | undefined>): Promise<void> {
    const url = `${this.baseUrl}${this.baseUrl.endsWith("/") ? "" : "/"}${REPORT_PATH.replace(/^\//, "")}`;
    const bodyStr = JSON.stringify(body);
    const u = new URL(url);
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port || (u.protocol === "https:" ? 443 : 80),
          path: u.pathname + u.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(bodyStr),
          },
        },
        (res) => {
          let data = "";
          const stream = res as unknown as { on(ev: string, fn: (chunk: Buffer | string) => void): void };
          stream.on("data", (chunk: Buffer | string) => (data += chunk.toString()));
          stream.on("end", () => resolve());
        },
      );
      req.on("error", reject);
      (req as unknown as { write: (chunk: string) => void; end: () => void }).write(bodyStr);
      (req as unknown as { write: (chunk: string) => void; end: () => void }).end();
    });
  }
}
