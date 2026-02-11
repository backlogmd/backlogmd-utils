import { describe, it, expect } from "vitest";
import { crossLink } from "../packages/parser/src/cross-link.js";
import type { RoadmapItem, ItemFolder, Task } from "@backlogmd/parser";

function makeItem(overrides: Partial<RoadmapItem> = {}): RoadmapItem {
  return {
    id: "001",
    name: "Test Item",
    type: "feature",
    status: "todo",
    statusDerived: null,
    itemSlug: "test-item",
    description: "A test item",
    taskRefs: [],
    source: "backlog.md",
    ...overrides,
  };
}

function makeFolder(overrides: Partial<ItemFolder> = {}): ItemFolder {
  return {
    slug: "test-item",
    name: "Test Item",
    type: "feature",
    status: "open",
    goal: "Test goal",
    tasks: [],
    source: "items/test-item/index.md",
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "test-item/001",
    slug: "task-one",
    name: "Task One",
    status: "todo",
    priority: "001",
    owner: null,
    itemId: "001",
    dependsOn: [],
    blocks: [],
    description: "A task",
    acceptanceCriteria: [],
    source: "items/test-item/001-task-one.md",
    ...overrides,
  };
}

describe("crossLink", () => {
  it("links tasks to items via taskRefs", () => {
    const item = makeItem();
    const task1 = makeTask({ id: "test-item/001", priority: "001" });
    const task2 = makeTask({
      id: "test-item/002",
      priority: "002",
      slug: "task-two",
      name: "Task Two",
    });

    const result = crossLink([item], [makeFolder()], [task1, task2]);

    expect(result.items[0].taskRefs).toEqual(["test-item/001", "test-item/002"]);
    expect(result.errors).toHaveLength(0);
  });

  it("errors when task references nonexistent item", () => {
    const task = makeTask({ itemId: "999" });

    const result = crossLink([], [], [task]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("TASK_MISSING_ITEM");
    expect(result.errors[0].message).toContain("999");
  });

  it("errors when item references nonexistent folder", () => {
    const item = makeItem({ itemSlug: "nonexistent" });

    const result = crossLink([item], [], []);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("ITEM_MISSING_FOLDER");
    expect(result.errors[0].message).toContain("nonexistent");
  });

  it("does not error when itemSlug is null", () => {
    const item = makeItem({ itemSlug: null });

    const result = crossLink([item], [], []);

    expect(result.errors).toHaveLength(0);
  });

  describe("status derivation", () => {
    it("derives todo when all tasks are todo", () => {
      const item = makeItem();
      const task = makeTask({ status: "todo" });

      const result = crossLink([item], [makeFolder()], [task]);

      expect(result.items[0].statusDerived).toBe("todo");
    });

    it("derives done when all tasks are done", () => {
      const item = makeItem();
      const task1 = makeTask({ status: "done" });
      const task2 = makeTask({ id: "test-item/002", status: "done" });

      const result = crossLink([item], [makeFolder()], [task1, task2]);

      expect(result.items[0].statusDerived).toBe("done");
    });

    it("derives in-progress when any task is in-progress", () => {
      const item = makeItem();
      const task1 = makeTask({ status: "todo" });
      const task2 = makeTask({ id: "test-item/002", status: "in-progress" });

      const result = crossLink([item], [makeFolder()], [task1, task2]);

      expect(result.items[0].statusDerived).toBe("in-progress");
    });

    it("derives in-progress when any task is ready-to-review", () => {
      const item = makeItem();
      const task = makeTask({ status: "ready-to-review" });

      const result = crossLink([item], [makeFolder()], [task]);

      expect(result.items[0].statusDerived).toBe("in-progress");
    });

    it("derives in-progress when any task is ready-to-test", () => {
      const item = makeItem();
      const task = makeTask({ status: "ready-to-test" });

      const result = crossLink([item], [makeFolder()], [task]);

      expect(result.items[0].statusDerived).toBe("in-progress");
    });

    it("derives in-progress when mix of done and todo tasks", () => {
      const item = makeItem();
      const task1 = makeTask({ status: "done" });
      const task2 = makeTask({ id: "test-item/002", status: "todo" });

      const result = crossLink([item], [makeFolder()], [task1, task2]);

      expect(result.items[0].statusDerived).toBe("in-progress");
    });

    it("derives todo when item has no tasks", () => {
      const item = makeItem();

      const result = crossLink([item], [makeFolder()], []);

      expect(result.items[0].statusDerived).toBe("todo");
    });

    it("warns when declared status differs from derived", () => {
      const item = makeItem({ status: "todo" });
      const task = makeTask({ status: "in-progress" });

      const result = crossLink([item], [makeFolder()], [task]);

      const warning = result.warnings.find((w) => w.code === "ITEM_STATUS_MISMATCH");
      expect(warning).toBeDefined();
      expect(warning!.message).toContain("todo");
      expect(warning!.message).toContain("in-progress");
    });

    it("no warning when declared matches derived", () => {
      const item = makeItem({ status: "in-progress" });
      const task = makeTask({ status: "in-progress" });

      const result = crossLink([item], [makeFolder()], [task]);

      const warning = result.warnings.find((w) => w.code === "ITEM_STATUS_MISMATCH");
      expect(warning).toBeUndefined();
    });
  });

  describe("table-vs-file consistency", () => {
    it("warns on status mismatch between table and file", () => {
      const item = makeItem();
      const folder = makeFolder({
        tasks: [
          {
            priority: "001",
            name: "Task One",
            fileName: "001-task-one.md",
            status: "todo",
            owner: null,
            dependsOn: [],
          },
        ],
      });
      const task = makeTask({ status: "in-progress" });

      const result = crossLink([item], [folder], [task]);

      const warning = result.warnings.find((w) => w.code === "STATUS_MISMATCH");
      expect(warning).toBeDefined();
      expect(warning!.message).toContain("todo");
      expect(warning!.message).toContain("in-progress");
    });

    it("warns on owner mismatch between table and file", () => {
      const item = makeItem();
      const folder = makeFolder({
        tasks: [
          {
            priority: "001",
            name: "Task One",
            fileName: "001-task-one.md",
            status: "todo",
            owner: "@alice",
            dependsOn: [],
          },
        ],
      });
      const task = makeTask({ owner: "@bob" });

      const result = crossLink([item], [folder], [task]);

      const warning = result.warnings.find((w) => w.code === "OWNER_MISMATCH");
      expect(warning).toBeDefined();
      expect(warning!.message).toContain("@alice");
      expect(warning!.message).toContain("@bob");
    });

    it("warns when table references task with no file", () => {
      const folder = makeFolder({
        tasks: [
          {
            priority: "099",
            name: "Ghost Task",
            fileName: "099-ghost.md",
            status: "todo",
            owner: null,
            dependsOn: [],
          },
        ],
      });

      const result = crossLink([], [folder], []);

      const warning = result.warnings.find((w) => w.code === "TABLE_TASK_MISSING_FILE");
      expect(warning).toBeDefined();
      expect(warning!.message).toContain("Ghost Task");
    });

    it("no warnings when table and file are in sync", () => {
      const item = makeItem();
      const folder = makeFolder({
        tasks: [
          {
            priority: "001",
            name: "Task One",
            fileName: "001-task-one.md",
            status: "todo",
            owner: null,
            dependsOn: [],
          },
        ],
      });
      const task = makeTask({ status: "todo", owner: null });

      const result = crossLink([item], [folder], [task]);

      const syncWarnings = result.warnings.filter(
        (w) => w.code === "STATUS_MISMATCH" || w.code === "OWNER_MISMATCH",
      );
      expect(syncWarnings).toHaveLength(0);
    });
  });

  describe("circular dependency detection", () => {
    it("detects a simple cycle", () => {
      const task1 = makeTask({ id: "f/001", dependsOn: ["f/002"] });
      const task2 = makeTask({ id: "f/002", dependsOn: ["f/001"], slug: "t2", name: "T2" });

      const result = crossLink([], [], [task1, task2]);

      const cycleError = result.errors.find((e) => e.code === "CIRCULAR_DEPENDENCY");
      expect(cycleError).toBeDefined();
    });

    it("detects a 3-node cycle", () => {
      const task1 = makeTask({ id: "f/001", dependsOn: ["f/002"] });
      const task2 = makeTask({ id: "f/002", dependsOn: ["f/003"], slug: "t2", name: "T2" });
      const task3 = makeTask({ id: "f/003", dependsOn: ["f/001"], slug: "t3", name: "T3" });

      const result = crossLink([], [], [task1, task2, task3]);

      const cycleError = result.errors.find((e) => e.code === "CIRCULAR_DEPENDENCY");
      expect(cycleError).toBeDefined();
    });

    it("no error when dependencies are acyclic", () => {
      const task1 = makeTask({ id: "f/001", dependsOn: [] });
      const task2 = makeTask({ id: "f/002", dependsOn: ["f/001"], slug: "t2", name: "T2" });
      const task3 = makeTask({ id: "f/003", dependsOn: ["f/002"], slug: "t3", name: "T3" });

      const result = crossLink([], [], [task1, task2, task3]);

      const cycleError = result.errors.find((e) => e.code === "CIRCULAR_DEPENDENCY");
      expect(cycleError).toBeUndefined();
    });
  });
});
