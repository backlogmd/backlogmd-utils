import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Backlogmd } from "@backlogmd/core";
import { createServer } from "../src/server.js";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import http from "node:http";

describe("server", () => {
  let port: number;
  let server: ReturnType<typeof createServer>;

  beforeEach(async () => {
    port = 3000 + Math.floor(Math.random() * 1000);
    const fixturePath = path.resolve(__dirname, "../../../tests/fixtures/spec-v4");
    const backlogmd = await Backlogmd.load({ rootDir: fixturePath });
    server = createServer(port, fixturePath, { backlogmd });
  });

  afterEach(() => {
    server.close();
  });

  it("GET / returns HTML with status 200", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        resolve(res);
      });
      req.on("error", reject);
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
  });

  it("GET /api/backlog returns JSON (BacklogStateDto) with work and validation", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { statusCode, body } = await new Promise<{ statusCode: number; body: string }>(
      (resolve, reject) => {
        const req = http.get(`http://localhost:${port}/api/backlog`, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk.toString()));
          res.on("end", () => resolve({ statusCode: res.statusCode!, body: data }));
        });
        req.on("error", reject);
      },
    );

    expect(statusCode).toBe(200);
    const data = JSON.parse(body) as { protocol: string; work: { slug: string; tasks: { itemSlug: string }[] }[]; validation: { errors: unknown[]; warnings: unknown[] } };
    expect(data.protocol).toBeDefined();
    expect(data.work).toBeDefined();
    expect(Array.isArray(data.work)).toBe(true);
    expect(data.validation).toBeDefined();
    expect(data.work.length).toBeGreaterThan(0);
    for (const item of data.work) {
      expect(item.slug).toBeDefined();
      expect(Array.isArray(item.tasks)).toBe(true);
    }
  });

  it("GET /events returns text/event-stream", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/events`, (res) => {
        resolve(res);
      });
      req.on("error", reject);
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
  });

  it("returns 404 for unknown routes", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/unknown`, (res) => {
        resolve(res);
      });
      req.on("error", reject);
    });

    expect(res.statusCode).toBe(404);
  });

  it("notifyClients sends reload message to SSE clients", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/events`, (res) => {
        resolve(res);
      });
      req.on("error", reject);
    });

    let data = "";
    res.on("data", (chunk) => {
      data += chunk.toString();
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    server.notifyClients();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(data).toContain("data: reload");
  });
});

// ── PATCH /api/tasks/:source ──────────────────────────────────────────

/**
 * Helper: make an HTTP request and collect the full response body.
 */
function request(
  url: string,
  options: http.RequestOptions,
  body?: string,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk.toString()));
      res.on("end", () =>
        resolve({ statusCode: res.statusCode!, body: data }),
      );
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Recursively copy a directory for tests that mutate fixtures.
 */
function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

describe("PATCH /api/tasks/:source", () => {
  let port: number;
  let server: ReturnType<typeof createServer>;
  let tmpDir: string;

  beforeEach(async () => {
    port = 4000 + Math.floor(Math.random() * 1000);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "backlogmd-patch-test-"));
    const fixtureSrc = path.resolve(__dirname, "../../../tests/fixtures/spec-v4");
    copyDirSync(fixtureSrc, tmpDir);
    const backlogmd = await Backlogmd.load({ rootDir: tmpDir });
    server = createServer(port, tmpDir, { backlogmd });
  });

  afterEach(() => {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns 200 and updates the task file on disk", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const taskSource = "work/001-chore-project-foundation/002-docker-setup.md";
    const encoded = encodeURIComponent(taskSource);

    const res = await request(
      `http://localhost:${port}/api/tasks/${encoded}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" } },
      JSON.stringify({ status: "done" }),
    );

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.ok).toBe(true);

    // Verify the file was actually updated on disk
    const taskContent = fs.readFileSync(
      path.join(tmpDir, taskSource),
      "utf-8",
    );
    expect(taskContent).toMatch(/status:\s*done/i);
    expect(taskContent).not.toContain("Status: in-progress");
  });

  it("returns 404 for unknown task source", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const encoded = encodeURIComponent("work/nonexistent/999-ghost.md");

    const res = await request(
      `http://localhost:${port}/api/tasks/${encoded}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" } },
      JSON.stringify({ status: "done" }),
    );

    expect(res.statusCode).toBe(404);
    const json = JSON.parse(res.body);
    expect(json.error).toContain("not found");
  });

  it("returns 400 for invalid status value", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const taskSource = "work/001-chore-project-foundation/002-docker-setup.md";
    const encoded = encodeURIComponent(taskSource);

    const res = await request(
      `http://localhost:${port}/api/tasks/${encoded}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" } },
      JSON.stringify({ status: "invalid-status" }),
    );

    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.body);
    expect(json.error).toContain("Invalid status");
  });

  it("returns 400 for invalid JSON body", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const taskSource = "work/001-chore-project-foundation/002-docker-setup.md";
    const encoded = encodeURIComponent(taskSource);

    const res = await request(
      `http://localhost:${port}/api/tasks/${encoded}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" } },
      "not-json",
    );

    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.body);
    expect(json.error).toBeDefined();
    expect(
      json.error.includes("Invalid JSON") || json.error.includes("Bad Request"),
    ).toBe(true);
  });

  it("triggers SSE reload after successful patch", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Connect an SSE client
    const sseRes = await new Promise<http.IncomingMessage>(
      (resolve, reject) => {
        const req = http.get(
          `http://localhost:${port}/events`,
          (res) => resolve(res),
        );
        req.on("error", reject);
      },
    );

    let sseData = "";
    sseRes.on("data", (chunk) => (sseData += chunk.toString()));

    await new Promise((resolve) => setTimeout(resolve, 100));

    // PATCH a task
    const taskSource = "work/001-chore-project-foundation/002-docker-setup.md";
    const encoded = encodeURIComponent(taskSource);
    await request(
      `http://localhost:${port}/api/tasks/${encoded}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" } },
      JSON.stringify({ status: "done" }),
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(sseData).toContain("data: reload");
  });
});

// ── POST /api/workers/assign ───────────────────────────────────────────

describe("POST /api/workers/assign", () => {
  let port: number;
  let server: ReturnType<typeof createServer>;

  beforeEach(async () => {
    port = 5000 + Math.floor(Math.random() * 1000);
    const fixturePath = path.resolve(__dirname, "../../../tests/fixtures/spec-v4");
    const backlogmd = await Backlogmd.load({ rootDir: fixturePath });
    server = createServer(port, fixturePath, { backlogmd });
  });

  afterEach(() => {
    server.close();
  });

  it("returns 200 with ok JSON", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await request(
      `http://localhost:${port}/api/workers/assign`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
      JSON.stringify({ workerId: "worker-1", taskId: "task-123" }),
    );

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json).toEqual({ ok: true });
  });

  it("returns 400 when body is missing workerId", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await request(
      `http://localhost:${port}/api/workers/assign`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
      "{}",
    );

    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.body);
    expect(json.error).toContain("Missing");
  });

  it("returns 200 with ok JSON when assigning by itemId", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await request(
      `http://localhost:${port}/api/workers/assign`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
      JSON.stringify({ workerId: "staff-engineer", itemId: "001-chore-project" }),
    );

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json).toEqual({ ok: true });
  });
});
