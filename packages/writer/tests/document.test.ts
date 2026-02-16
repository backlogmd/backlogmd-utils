import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildBacklogOutput } from "@backlogmd/parser";
import { BacklogDocument } from "../src/document.js";

/**
 * Copy a directory recursively.
 */
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

// spec-v4 fixture: 001-chore-project-foundation with tasks 001-install-next-react-tailwind (open), 002-docker-setup (open)
const FIXTURE_SRC = path.resolve(
  __dirname,
  "../../..",
  "tests/fixtures/spec-v4",
);

const TASK_002_SOURCE = "work/001-chore-project-foundation/002-docker-setup.md";
const TASK_001_SOURCE = "work/001-chore-project-foundation/001-install-next-react-tailwind.md";

describe("BacklogDocument (SPEC v4)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "writer-test-"));
    copyDirSync(FIXTURE_SRC, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads the fixture and exposes the model", async () => {
    const doc = await BacklogDocument.load(tmpDir);
    expect(doc.model.protocol).toBeDefined();
    expect(doc.model.entries.length).toBeGreaterThanOrEqual(1);
    expect(doc.model.tasks.length).toBeGreaterThanOrEqual(2);
  });

  describe("changeTaskStatus: mark task 002 as done", () => {
    it("returns 1 patch (task file only)", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(TASK_002_SOURCE, "done");

      expect(changeset.patches).toHaveLength(1);
      const taskPatch = changeset.patches[0];
      expect(taskPatch.filePath).toBe(TASK_002_SOURCE);
      expect(taskPatch.description).toContain("open → done");
    });

    it("modelAfter reflects the updated status", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(TASK_002_SOURCE, "done");

      const task = changeset.modelAfter.tasks.find((t) => t.source === TASK_002_SOURCE);
      expect(task!.status).toBe("done");
    });

    it("modelBefore is unchanged", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(TASK_002_SOURCE, "done");

      const task = changeset.modelBefore.tasks.find((t) => t.source === TASK_002_SOURCE);
      expect(task!.status).toBe("open");
    });
  });

  describe("changeTaskStatus: itemSlug/priority format", () => {
    it("accepts itemSlug/priority as task identifier", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus("001-chore-project-foundation/2", "done");

      expect(changeset.patches).toHaveLength(1);
    });
  });

  describe("changeTaskStatus: no-op", () => {
    it("returns empty changeset when task already has target status", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(TASK_001_SOURCE, "open");

      expect(changeset.patches).toHaveLength(0);
    });
  });

  describe("changeTaskStatus: error cases", () => {
    it("throws if task does not exist", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      expect(() =>
        doc.changeTaskStatus("nonexistent/999", "done"),
      ).toThrow('Task "nonexistent/999" not found');
    });
  });

  describe("commit", () => {
    it("writes patches to disk and re-parsing produces consistent model", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(TASK_002_SOURCE, "done");

      await doc.commit(changeset);

      const reparsed = buildBacklogOutput(tmpDir);
      const task002 = reparsed.tasks.find(
        (t) => t.source === TASK_002_SOURCE || t.priority === "2",
      );
      expect(task002!.status).toBe("done");
    });

    it("updates the document model after commit", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(TASK_002_SOURCE, "done");

      await doc.commit(changeset);

      const task = doc.model.tasks.find((t) => t.source === TASK_002_SOURCE);
      expect(task!.status).toBe("done");
    });

    it("does nothing when changeset has no patches", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(TASK_001_SOURCE, "open");

      const beforeContent = fs.readFileSync(
        path.join(tmpDir, TASK_001_SOURCE),
        "utf-8",
      );

      await doc.commit(changeset);

      const afterContent = fs.readFileSync(
        path.join(tmpDir, TASK_001_SOURCE),
        "utf-8",
      );
      expect(afterContent).toBe(beforeContent);
    });

    it("verifies surgical edits preserve surrounding content", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(TASK_002_SOURCE, "done");

      await doc.commit(changeset);

      const taskContent = fs.readFileSync(
        path.join(tmpDir, TASK_002_SOURCE),
        "utf-8",
      );
      expect(taskContent).toContain("task: Docker setup");
      expect(taskContent).toContain("status: done");
      expect(taskContent).toContain("## Description");
      expect(taskContent).toContain("## Acceptance criteria");
    });
  });
});
