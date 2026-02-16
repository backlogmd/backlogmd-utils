import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { BacklogCore } from "@backlogmd/core";
import { Worker } from "../src/workerRunner.js";
import type { CodeAgent } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, "../../../tests/fixtures");
const SPEC_V4_SRC = path.join(FIXTURES, "spec-v4");

function copyDirSync(src: string, dest: string): void {
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

const mockAgent: CodeAgent = {
  name: "mock",
  execute: vi.fn().mockResolvedValue({ success: true, result: "Task executed" }),
};

describe("Worker", () => {
  let tmpFixtureDir: string;

  beforeEach(() => {
    tmpFixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-spec-v4-"));
    copyDirSync(SPEC_V4_SRC, tmpFixtureDir);
  });

  afterEach(() => {
    fs.rmSync(tmpFixtureDir, { recursive: true, force: true });
  });

  describe("runTaskById", () => {
    it("executes a task by ID", async () => {
      const core = await BacklogCore.load({
        rootDir: tmpFixtureDir,
      });
      const worker = new Worker(core, mockAgent);

      await worker.runTaskById("001");

      expect(mockAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "001",
          title: "Install Next.js, React and Tailwind",
        }),
      );
    });

    it("passes full task context to agent", async () => {
      const core = await BacklogCore.load({
        rootDir: tmpFixtureDir,
      });
      const worker = new Worker(core, mockAgent);

      await worker.runTaskById("001");

      expect(mockAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.any(String),
          acceptanceCriteria: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String),
              checked: expect.any(Boolean),
            }),
          ]),
        }),
      );
    });

    it("throws error for invalid task ID", async () => {
      const core = await BacklogCore.load({
        rootDir: tmpFixtureDir,
      });
      const worker = new Worker(core, mockAgent);

      await expect(worker.runTaskById("999")).rejects.toThrow('Task "999" not found');
    });
  });

  describe("status workflow", () => {
    it("updates status to ip when starting task", async () => {
      const core = await BacklogCore.load({
        rootDir: tmpFixtureDir,
      });
      const worker = new Worker(core, mockAgent);

      await worker.runTaskById("001");

      const state = core.getState();
      const task = state.tasks.find((t) => path.basename(t.source, ".md").startsWith("001-"));
      expect(task?.status).toBe("done");
    });

    it("reverts status to open on task failure", async () => {
      const failingAgent: CodeAgent = {
        name: "failing",
        execute: vi.fn().mockResolvedValue({ success: false, error: "Task failed" }),
      };
      const core = await BacklogCore.load({
        rootDir: tmpFixtureDir,
      });
      const worker = new Worker(core, failingAgent);

      await worker.runTaskById("002");

      const state = core.getState();
      const task = state.tasks.find((t) => path.basename(t.source, ".md").startsWith("002-"));
      expect(task?.status).toBe("open");
    });
  });

  describe("CLI argument handling", () => {
    it("accepts task ID as second argument", async () => {
      const args = ["/path/to/backlog", "001"];
      expect(args.length).toBe(2);
      expect(args[1]).toBe("001");
    });

    it("works without task ID argument", async () => {
      const args = ["/path/to/backlog"];
      expect(args.length).toBe(1);
    });
  });
});
