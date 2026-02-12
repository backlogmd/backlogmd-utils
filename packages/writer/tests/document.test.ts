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

// The happy-path fixture has:
//   - Entry: 001-feat-my-feature
//   - Item folder: work/001-feat-my-feature/ with two tasks
//   - Task 001 "Setup project" status=done
//   - Task 002 "Add login" status=in-progress
const FIXTURE_SRC = path.resolve(
  __dirname,
  "../../..",
  "tests/fixtures/happy-path",
);

describe("BacklogDocument (SPEC v2)", () => {
  let tmpDir: string;

  beforeEach(() => {
    // Create a temp copy of the fixture so we can write to it
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "writer-test-"));
    copyDirSync(FIXTURE_SRC, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads the fixture and exposes the model", async () => {
    const doc = await BacklogDocument.load(tmpDir);
    expect(doc.model.protocol).toBe("backlogmd/v2");
    expect(doc.model.entries).toHaveLength(1);
    expect(doc.model.tasks).toHaveLength(2);
  });

  // ─── changeTaskStatus: task 002 in-progress → done ────────────────

  describe("changeTaskStatus: mark task 002 as done", () => {
    it("returns 1 patch (task file only, no table/backlog in SPEC v2)", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(
        "work/001-feat-my-feature/002-add-login.md",
        "done",
      );

      // SPEC v2: only the task file needs patching (no table, no backlog status)
      expect(changeset.patches).toHaveLength(1);

      const taskPatch = changeset.patches[0];
      expect(taskPatch.filePath).toBe("work/001-feat-my-feature/002-add-login.md");
      expect(taskPatch.description).toContain("in-progress → done");
    });

    it("modelAfter reflects the updated status", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(
        "work/001-feat-my-feature/002-add-login.md",
        "done",
      );

      const task = changeset.modelAfter.tasks.find(
        (t) => t.source === "work/001-feat-my-feature/002-add-login.md",
      );
      expect(task!.status).toBe("done");
    });

    it("modelBefore is unchanged", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(
        "work/001-feat-my-feature/002-add-login.md",
        "done",
      );

      const task = changeset.modelBefore.tasks.find(
        (t) => t.source === "work/001-feat-my-feature/002-add-login.md",
      );
      expect(task!.status).toBe("in-progress");
    });
  });

  // ─── changeTaskStatus: using itemSlug/priority format ──────────────

  describe("changeTaskStatus: itemSlug/priority format", () => {
    it("accepts itemSlug/priority as task identifier", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus("001-feat-my-feature/002", "done");

      expect(changeset.patches).toHaveLength(1);
    });
  });

  // ─── changeTaskStatus: no-op when already at target status ─────────

  describe("changeTaskStatus: no-op", () => {
    it("returns empty changeset when task already has target status", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(
        "work/001-feat-my-feature/001-setup-project.md",
        "done",
      );

      expect(changeset.patches).toHaveLength(0);
    });
  });

  // ─── changeTaskStatus: unknown task ────────────────────────────────

  describe("changeTaskStatus: error cases", () => {
    it("throws if task does not exist", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      expect(() =>
        doc.changeTaskStatus("nonexistent/999", "done"),
      ).toThrow('Task "nonexistent/999" not found');
    });
  });

  // ─── commit: write patches to disk and re-parse ────────────────────

  describe("commit", () => {
    it("writes patches to disk and re-parsing produces consistent model", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(
        "work/001-feat-my-feature/002-add-login.md",
        "done",
      );

      await doc.commit(changeset);

      // Re-parse the fixture from disk
      const reparsed = buildBacklogOutput(tmpDir);

      // Task 002 should now be "done"
      const task002 = reparsed.tasks.find((t) => t.priority === "002");
      expect(task002!.status).toBe("done");
    });

    it("updates the document model after commit", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(
        "work/001-feat-my-feature/002-add-login.md",
        "done",
      );

      await doc.commit(changeset);

      const task = doc.model.tasks.find(
        (t) => t.source === "work/001-feat-my-feature/002-add-login.md",
      );
      expect(task!.status).toBe("done");
    });

    it("does nothing when changeset has no patches", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(
        "work/001-feat-my-feature/001-setup-project.md",
        "done",
      );

      const beforeContent = fs.readFileSync(
        path.join(tmpDir, "work/001-feat-my-feature/001-setup-project.md"),
        "utf-8",
      );

      await doc.commit(changeset);

      const afterContent = fs.readFileSync(
        path.join(tmpDir, "work/001-feat-my-feature/001-setup-project.md"),
        "utf-8",
      );
      expect(afterContent).toBe(beforeContent);
    });

    it("verifies surgical edits preserve surrounding content", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus(
        "work/001-feat-my-feature/002-add-login.md",
        "done",
      );

      await doc.commit(changeset);

      const taskContent = fs.readFileSync(
        path.join(tmpDir, "work/001-feat-my-feature/002-add-login.md"),
        "utf-8",
      );
      expect(taskContent).toContain("Task: Add login");
      expect(taskContent).toContain("Status: done");
      expect(taskContent).toContain("Priority: 002");
      expect(taskContent).toContain("## Description");
      expect(taskContent).toContain("## Acceptance criteria");
      expect(taskContent).toContain("- [x] Login form renders");
    });
  });
});
