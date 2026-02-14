import { describe, it, expect } from "vitest";
import { crossLink } from "./crossLink.js";
import type { BacklogEntry, ItemFolder, Task } from "./types.js";

function makeEntry(overrides: Partial<BacklogEntry> = {}): BacklogEntry {
  return {
    slug: "001-feat-test",
    type: "feat",
    source: "backlog.md",
    ...overrides,
  };
}

function makeFolder(overrides: Partial<ItemFolder> = {}): ItemFolder {
  return {
    slug: "001-feat-test",
    type: "feat",
    tasks: [],
    source: "work/001-feat-test/index.md",
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    name: "Task One",
    status: "open",
    priority: 5,
    tid: "001",
    slug: "task-one",
    itemSlug: "001-feat-test",
    dependsOn: [],
    agent: "",
    humanReview: false,
    expiresAt: null,
    description: "A task",
    acceptanceCriteria: [],
    source: "work/001-feat-test/001-task-one.md",
    ...overrides,
  };
}

describe("crossLink (SPEC v3)", () => {
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

  describe("dep validation", () => {
    it("warns when dep references a non-existent tid", () => {
      const task = makeTask({
        tid: "002",
        dependsOn: ["999"],
        source: "work/001-feat-test/002-task.md",
      });
      const result = crossLink([], [], [task]);
      const warning = result.warnings.find((w) => w.code === "INVALID_DEP");
      expect(warning).toBeDefined();
      expect(warning!.message).toContain("999");
    });

    it("errors when task depends on itself", () => {
      const task = makeTask({
        tid: "001",
        dependsOn: ["001"],
      });
      const result = crossLink([], [], [task]);
      const error = result.errors.find((e) => e.code === "SELF_DEP");
      expect(error).toBeDefined();
    });

    it("no warning when dep references valid tid in same item", () => {
      const task1 = makeTask({ tid: "001", dependsOn: [] });
      const task2 = makeTask({
        tid: "002",
        slug: "task-two",
        name: "Task Two",
        dependsOn: ["001"],
        source: "work/001-feat-test/002-task-two.md",
      });
      const result = crossLink([], [], [task1, task2]);
      const depWarnings = result.warnings.filter((w) => w.code === "INVALID_DEP");
      expect(depWarnings).toHaveLength(0);
    });
  });

  describe("circular dependency detection", () => {
    it("detects a simple cycle", () => {
      const task1 = makeTask({
        tid: "001",
        slug: "t1",
        dependsOn: ["002"],
        source: "work/001-feat-test/001-t1.md",
      });
      const task2 = makeTask({
        tid: "002",
        slug: "t2",
        name: "T2",
        dependsOn: ["001"],
        source: "work/001-feat-test/002-t2.md",
      });

      const result = crossLink([], [], [task1, task2]);
      const cycleError = result.errors.find((e) => e.code === "CIRCULAR_DEPENDENCY");
      expect(cycleError).toBeDefined();
    });

    it("no error when dependencies are acyclic", () => {
      const task1 = makeTask({
        tid: "001",
        slug: "t1",
        dependsOn: [],
        source: "work/001-feat-test/001-t1.md",
      });
      const task2 = makeTask({
        tid: "002",
        slug: "t2",
        name: "T2",
        dependsOn: ["001"],
        source: "work/001-feat-test/002-t2.md",
      });

      const result = crossLink([], [], [task1, task2]);
      const cycleError = result.errors.find((e) => e.code === "CIRCULAR_DEPENDENCY");
      expect(cycleError).toBeUndefined();
    });
  });
});
