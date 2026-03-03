import http from "node:http";
import https from "node:https";

export interface WorkerReporterOptions {
    name: string;
    role: string;
}

export interface StatusUpdate {
    status: string;
    taskId?: string;
    itemId?: string;
    taskTitle?: string;
    log?: string;
}

/**
 * Reports worker status to the server via POST /api/workers/report.
 */
export class WorkerReporter {
    private baseUrl: string;
    private options: WorkerReporterOptions;

    constructor(serverUrl: string, options: WorkerReporterOptions) {
        this.baseUrl = serverUrl.replace(/\/$/, "");
        this.options = options;
    }

    reportStatus(update: StatusUpdate): void {
        const body = {
            ...this.options,
            ...update,
        };
        this.post(body);
    }

    reportStatusAndWait(update: StatusUpdate): Promise<void> {
        this.reportStatus(update);
        return new Promise((resolve) => setTimeout(resolve, 300));
    }

    private post(body: Record<string, unknown>): void {
        const url = new URL("/api/workers/report", this.baseUrl);
        const isHttps = url.protocol === "https:";
        const data = JSON.stringify(body);
        const req = (isHttps ? https : http).request(
            url.toString(),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(data, "utf-8"),
                },
            },
            (res) => {
                res.resume();
            },
        );
        req.on("error", (err) => {
            console.error("[worker-reporter] POST error:", err.message);
        });
        req.write(data);
        req.end();
    }
}
