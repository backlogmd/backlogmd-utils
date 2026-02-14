import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { createServer } from "@backlogmd/serve";
import { BacklogDocument } from "@backlogmd/writer";

// ─── Types for API response ──────────────────────────────────────────

interface BacklogApiResponse {
  protocol: string;
  entries: { slug: string }[];
  items: {
    slug: string;
    tasks: { slug: string; fileName: string }[];
    source: string;
  }[];
  tasks: {
    name: string;
    status: string;
    priority: number;
    tid: string;
    slug: string;
    itemSlug: string;
    source: string;
  }[];
  validation: {
    errors: { code: string; message: string }[];
    warnings: { code: string; message: string }[];
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Generate a SPEC v3 task file.
 */
function taskFile(name: string, status: string, priority: number): string {
  return [
    "<!-- METADATA -->",
    "",
    "```yaml",
    `t: ${name}`,
    `s: ${status}`,
    `p: ${priority}`,
    "dep: []",
    'a: ""',
    "h: false",
    "expiresAt: null",
    "```",
    "",
    "<!-- DESCRIPTION -->",
    "",
    "## Description",
    "",
    `${name} task.`,
    "",
    "<!-- ACCEPTANCE -->",
    "",
    "## Acceptance criteria",
    "",
    "- [ ] Done",
    "",
  ].join("\n");
}

/**
 * Scaffold a minimal backlog from scratch in the given directory.
 *
 * Creates:
 *   backlog.md                                  (one entry)
 *   work/001-feat-dashboard-flow/index.md       (two task refs)
 *   work/001-feat-dashboard-flow/001-setup.md   (status: open)
 *   work/001-feat-dashboard-flow/002-implement.md (status: open)
 */
function scaffoldBacklog(dir: string): void {
  const itemDir = path.join(dir, "work", "001-feat-dashboard-flow");
  fs.mkdirSync(itemDir, { recursive: true });

  fs.writeFileSync(
    path.join(dir, "backlog.md"),
    "- [001-feat-dashboard-flow](work/001-feat-dashboard-flow/index.md)\n",
  );

  fs.writeFileSync(
    path.join(itemDir, "index.md"),
    "- [001-setup](001-setup.md)\n- [002-implement](002-implement.md)\n",
  );

  fs.writeFileSync(
    path.join(itemDir, "001-setup.md"),
    taskFile("Setup", "open", 5),
  );

  fs.writeFileSync(
    path.join(itemDir, "002-implement.md"),
    taskFile("Implement", "open", 10),
  );
}

/**
 * Fetch the backlog JSON from the running server.
 */
async function fetchBacklog(port: number): Promise<BacklogApiResponse> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}/api/backlog`, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
  });
}

/**
 * Derive an item's column from its task statuses.
 * Mirrors the Board.tsx deriveStatus() logic exactly.
 */
function deriveItemColumn(taskStatuses: string[]): string {
  if (taskStatuses.length === 0) return "open";
  if (taskStatuses.every((s) => s === "done")) return "done";
  if (taskStatuses.every((s) => s === "open" || s === "plan")) return "open";
  return "in-progress";
}

/**
 * Get the derived column for an item from the API response data.
 */
function getItemColumn(data: BacklogApiResponse, itemSlug: string): string {
  const itemTasks = data.tasks.filter((t) => t.itemSlug === itemSlug);
  return deriveItemColumn(itemTasks.map((t) => t.status));
}

// ─── Tests ───────────────────────────────────────────────────────────

// TODO: Re-enable once @backlogmd/writer is updated to SPEC v3 format
describe.skip("e2e: write → dashboard → update → column movement", () => {
  let tmpDir: string;
  let port: number;
  let server: ReturnType<typeof createServer>;
  let doc: BacklogDocument;

  const ITEM_SLUG = "001-feat-dashboard-flow";

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-test-"));
    scaffoldBacklog(tmpDir);

    port = 4000 + Math.floor(Math.random() * 1000);
    server = createServer(port, tmpDir);

    // Wait for the server to start listening
    await new Promise((resolve) => setTimeout(resolve, 100));

    doc = await BacklogDocument.load(tmpDir);
  });

  afterEach(() => {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── Test 1 ──────────────────────────────────────────────────────

  it("newly created feature appears in Open column", async () => {
    const data = await fetchBacklog(port);

    // The scaffolded item appears in the backlog
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].slug).toBe(ITEM_SLUG);

    // Both tasks are open
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks.every((t) => t.status === "open")).toBe(true);

    // Item derives to the "open" column
    expect(getItemColumn(data, ITEM_SLUG)).toBe("open");
  });

  // ─── Test 2 ──────────────────────────────────────────────────────

  it("updating a task to ip moves item to In Progress column", async () => {
    const changeset = doc.changeTaskStatus(
      "work/001-feat-dashboard-flow/001-setup.md",
      "ip",
    );
    await doc.commit(changeset);

    const data = await fetchBacklog(port);

    const task001 = data.tasks.find((t) => t.tid === "001")!;
    expect(task001.status).toBe("ip");

    // Mixed statuses → "in-progress" column
    expect(getItemColumn(data, ITEM_SLUG)).toBe("in-progress");
  });

  // ─── Test 3 ──────────────────────────────────────────────────────

  it("completing all tasks moves item to Done column", async () => {
    let changeset = doc.changeTaskStatus(
      "work/001-feat-dashboard-flow/001-setup.md",
      "done",
    );
    await doc.commit(changeset);

    changeset = doc.changeTaskStatus(
      "work/001-feat-dashboard-flow/002-implement.md",
      "done",
    );
    await doc.commit(changeset);

    const data = await fetchBacklog(port);

    expect(data.tasks.every((t) => t.status === "done")).toBe(true);

    // All done → "done" column
    expect(getItemColumn(data, ITEM_SLUG)).toBe("done");
  });

  // ─── Test 4 ──────────────────────────────────────────────────────

  it("full lifecycle: open → ip → done in sequence", async () => {
    // 1. Initial state: all tasks open → item in "open" column
    let data = await fetchBacklog(port);
    expect(getItemColumn(data, ITEM_SLUG)).toBe("open");

    // 2. Start work on task 001 → item moves to "in-progress"
    let changeset = doc.changeTaskStatus(
      "work/001-feat-dashboard-flow/001-setup.md",
      "ip",
    );
    await doc.commit(changeset);

    data = await fetchBacklog(port);
    expect(getItemColumn(data, ITEM_SLUG)).toBe("in-progress");

    // 3. Finish task 001, task 002 still open → stays "in-progress"
    changeset = doc.changeTaskStatus(
      "work/001-feat-dashboard-flow/001-setup.md",
      "done",
    );
    await doc.commit(changeset);

    data = await fetchBacklog(port);
    expect(getItemColumn(data, ITEM_SLUG)).toBe("in-progress");

    // 4. Finish task 002 → all done → item moves to "done"
    changeset = doc.changeTaskStatus(
      "work/001-feat-dashboard-flow/002-implement.md",
      "done",
    );
    await doc.commit(changeset);

    data = await fetchBacklog(port);
    expect(getItemColumn(data, ITEM_SLUG)).toBe("done");
  });
});
