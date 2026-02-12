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
//   - Item 001 "My Feature" with status "in-progress"
//   - Task 001 "Setup project" status=done, owner=@alice
//   - Task 002 "Add login" status=in-progress, owner=@bob
const FIXTURE_SRC = path.resolve(
  __dirname,
  "../../..",
  "tests/fixtures/happy-path",
);

describe("BacklogDocument", () => {
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
    expect(doc.model.protocol).toBe("backlogmd/v1");
    expect(doc.model.items).toHaveLength(1);
    expect(doc.model.tasks).toHaveLength(2);
  });

  // ─── changeTaskStatus: task 002 in-progress → done ────────────────

  describe("changeTaskStatus: mark task 002 as done", () => {
    it("returns 3 patches (task file, index table, backlog.md)", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus("my-feature/002", "done");

      // Should produce patches for:
      // 1. Task file (002-add-login.md) status: in-progress → done
      // 2. Index table row 002 status: in-progress → done
      // 3. Backlog.md item status: in-progress → done (since both tasks now done)
      expect(changeset.patches).toHaveLength(3);

      const taskPatch = changeset.patches.find((p) =>
        p.filePath.endsWith("002-add-login.md"),
      );
      expect(taskPatch).toBeDefined();
      expect(taskPatch!.description).toContain("in-progress → done");

      const indexPatch = changeset.patches.find((p) =>
        p.filePath.endsWith("index.md"),
      );
      expect(indexPatch).toBeDefined();

      const backlogPatch = changeset.patches.find(
        (p) => p.filePath === "backlog.md",
      );
      expect(backlogPatch).toBeDefined();
      expect(backlogPatch!.description).toContain("in-progress → done");
    });

    it("modelAfter reflects the updated statuses", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus("my-feature/002", "done");

      // Task should be updated
      const task = changeset.modelAfter.tasks.find(
        (t) => t.id === "my-feature/002",
      );
      expect(task!.status).toBe("done");

      // Item should be derived as done (both tasks now done)
      const item = changeset.modelAfter.items[0];
      expect(item.status).toBe("done");
      expect(item.statusDerived).toBe("done");

      // Item folder task stub should be updated
      const folder = changeset.modelAfter.itemFolders[0];
      const stub = folder.tasks.find((t) => t.priority === "002");
      expect(stub!.status).toBe("done");
    });

    it("modelBefore is unchanged", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus("my-feature/002", "done");

      const task = changeset.modelBefore.tasks.find(
        (t) => t.id === "my-feature/002",
      );
      expect(task!.status).toBe("in-progress");

      const item = changeset.modelBefore.items[0];
      expect(item.status).toBe("in-progress");
    });
  });

  // ─── changeTaskStatus: no-op when already at target status ─────────

  describe("changeTaskStatus: no-op", () => {
    it("returns empty changeset when task already has target status", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus("my-feature/001", "done");

      expect(changeset.patches).toHaveLength(0);
    });
  });

  // ─── changeTaskStatus: no backlog.md patch when item status unchanged

  describe("changeTaskStatus: partial cascade (no backlog.md change)", () => {
    it("returns 2 patches when item status does not change", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      // Changing task 002 from in-progress to ready-to-review
      // Item derived status stays "in-progress" (task 001=done, task 002=ready-to-review → in-progress)
      const changeset = doc.changeTaskStatus(
        "my-feature/002",
        "ready-to-review",
      );

      expect(changeset.patches).toHaveLength(2);

      // No backlog.md patch
      const backlogPatch = changeset.patches.find(
        (p) => p.filePath === "backlog.md",
      );
      expect(backlogPatch).toBeUndefined();
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
      const changeset = doc.changeTaskStatus("my-feature/002", "done");

      await doc.commit(changeset);

      // Re-parse the fixture from disk
      const reparsed = buildBacklogOutput(tmpDir);

      // Task 002 should now be "done"
      const task002 = reparsed.tasks.find((t) => t.id === "my-feature/002");
      expect(task002!.status).toBe("done");

      // Item should derive as "done"
      expect(reparsed.items[0].statusDerived).toBe("done");
      expect(reparsed.items[0].status).toBe("done");

      // Item folder task stub should also be "done"
      const stub = reparsed.itemFolders[0].tasks.find(
        (t) => t.priority === "002",
      );
      expect(stub!.status).toBe("done");

      // No validation warnings about status mismatches
      const statusMismatches = reparsed.validation.warnings.filter(
        (w) =>
          w.code === "STATUS_MISMATCH" ||
          w.code === "ITEM_STATUS_MISMATCH",
      );
      expect(statusMismatches).toHaveLength(0);
    });

    it("updates the document model after commit", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus("my-feature/002", "done");

      await doc.commit(changeset);

      // The document's internal model should now reflect the change
      const task = doc.model.tasks.find((t) => t.id === "my-feature/002");
      expect(task!.status).toBe("done");
    });

    it("does nothing when changeset has no patches", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus("my-feature/001", "done");

      // Read original file before commit
      const beforeContent = fs.readFileSync(
        path.join(tmpDir, "items/my-feature/001-setup-project.md"),
        "utf-8",
      );

      await doc.commit(changeset);

      // File should be unchanged
      const afterContent = fs.readFileSync(
        path.join(tmpDir, "items/my-feature/001-setup-project.md"),
        "utf-8",
      );
      expect(afterContent).toBe(beforeContent);
    });

    it("verifies surgical edits preserve surrounding content", async () => {
      const doc = await BacklogDocument.load(tmpDir);
      const changeset = doc.changeTaskStatus("my-feature/002", "done");

      await doc.commit(changeset);

      // Read the task file and verify non-status content is preserved
      const taskContent = fs.readFileSync(
        path.join(tmpDir, "items/my-feature/002-add-login.md"),
        "utf-8",
      );
      expect(taskContent).toContain("# Add login");
      expect(taskContent).toContain("- **Status:** done");
      expect(taskContent).toContain("- **Priority:** 002");
      expect(taskContent).toContain("- **Owner:** @bob");
      expect(taskContent).toContain("## Description");
      expect(taskContent).toContain("## Acceptance Criteria");
      expect(taskContent).toContain("- [x] Login form renders");

      // Read backlog.md and verify structure is preserved
      const backlogContent = fs.readFileSync(
        path.join(tmpDir, "backlog.md"),
        "utf-8",
      );
      expect(backlogContent).toContain("# Roadmap");
      expect(backlogContent).toContain("## Items");
      expect(backlogContent).toContain("### 001 - My Feature");
      expect(backlogContent).toContain("- **Type:** feature");
      expect(backlogContent).toContain("- **Status:** done");

      // Read index.md and verify table structure is preserved
      const indexContent = fs.readFileSync(
        path.join(tmpDir, "items/my-feature/index.md"),
        "utf-8",
      );
      expect(indexContent).toContain("# My Feature");
      expect(indexContent).toContain(
        "| # | Task | Status | Owner | Depends on |",
      );
      // Row 001 should still have its original values
      const lines = indexContent.split("\n");
      const row001 = lines.find((l) => l.includes("| 001 |"));
      expect(row001).toContain("done");
      expect(row001).toContain("@alice");
    });
  });
});
