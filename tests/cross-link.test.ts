import { describe, it, expect } from "vitest";
import { crossLink } from "../packages/parser/src/cross-link.js";
import type { BacklogEntry, ItemFolder, Task } from "@backlogmd/parser";

function makeEntry(overrides: Partial<BacklogEntry> = {}): BacklogEntry {
  return {
    slug: "001-feat-test",
<<<<<<< HEAD
=======
    type: "feat",
>>>>>>> 8c17d17 (v0.2)
    source: "backlog.md",
    ...overrides,
  };
}

function makeFolder(overrides: Partial<ItemFolder> = {}): ItemFolder {
  return {
    slug: "001-feat-test",
<<<<<<< HEAD
=======
    type: "feat",
>>>>>>> 8c17d17 (v0.2)
    tasks: [],
    source: "work/001-feat-test/index.md",
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    name: "Task One",
    status: "open",
    priority: "001",
    slug: "task-one",
    itemSlug: "001-feat-test",
    dependsOn: [],
    description: "A task",
    acceptanceCriteria: [],
    source: "work/001-feat-test/001-task-one.md",
    ...overrides,
  };
}

describe("crossLink (SPEC v2)", () => {
  it("returns entries unchanged", () => {
    const entry = makeEntry();
    const result = crossLink([entry], [makeFolder()], []);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].slug).toBe("001-feat-test");
  });

  it("errors when backlog entry has no matching folder", () => {
    const entry = makeEntry({ slug: "nonexistent" });
    const result = crossLink([entry], [], []);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("ENTRY_MISSING_FOLDER");
    expect(result.errors[0].message).toContain("nonexistent");
  });

  it("warns when folder exists but is not in backlog", () => {
    const folder = makeFolder({ slug: "orphan-item" });
    const result = crossLink([], [folder], []);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe("ORPHAN_FOLDER");
    expect(result.warnings[0].message).toContain("orphan-item");
  });

  it("no error when entry and folder match", () => {
    const entry = makeEntry();
    const folder = makeFolder();
    const result = crossLink([entry], [folder], []);
    expect(result.errors).toHaveLength(0);
  });

  describe("index-vs-file consistency", () => {
    it("warns when index references a task file that doesn't exist", () => {
      const folder = makeFolder({
        tasks: [{ slug: "099-ghost", fileName: "099-ghost.md" }],
      });
      const result = crossLink([], [folder], []);
      const warning = result.warnings.find((w) => w.code === "INDEX_TASK_MISSING_FILE");
      expect(warning).toBeDefined();
      expect(warning!.message).toContain("099-ghost.md");
    });

    it("no warning when index task refs match task files", () => {
      const folder = makeFolder({
        tasks: [{ slug: "001-task-one", fileName: "001-task-one.md" }],
      });
      const task = makeTask();
      const result = crossLink([], [folder], [task]);
      const missingWarnings = result.warnings.filter(
        (w) => w.code === "INDEX_TASK_MISSING_FILE",
      );
      expect(missingWarnings).toHaveLength(0);
    });
  });

  describe("circular dependency detection", () => {
    it("detects a simple cycle", () => {
      const task1 = makeTask({
        priority: "001",
        slug: "t1",
        dependsOn: ["t2"],
        source: "work/001-feat-test/001-t1.md",
      });
      const task2 = makeTask({
        priority: "002",
        slug: "t2",
        name: "T2",
        dependsOn: ["t1"],
        source: "work/001-feat-test/002-t2.md",
      });

      const result = crossLink([], [], [task1, task2]);
      const cycleError = result.errors.find((e) => e.code === "CIRCULAR_DEPENDENCY");
      expect(cycleError).toBeDefined();
    });

    it("no error when dependencies are acyclic", () => {
      const task1 = makeTask({
        priority: "001",
        slug: "t1",
        dependsOn: [],
        source: "work/001-feat-test/001-t1.md",
      });
      const task2 = makeTask({
        priority: "002",
        slug: "t2",
        name: "T2",
        dependsOn: ["t1"],
        source: "work/001-feat-test/002-t2.md",
      });

      const result = crossLink([], [], [task1, task2]);
      const cycleError = result.errors.find((e) => e.code === "CIRCULAR_DEPENDENCY");
      expect(cycleError).toBeUndefined();
    });
  });
});
