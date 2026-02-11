import { describe, it, expect } from "vitest";
import { crossLink } from "@backlogmd/parser";
import type { RoadmapFeature, FeatureFolder, Task } from "@backlogmd/parser";

function makeFeature(overrides: Partial<RoadmapFeature> = {}): RoadmapFeature {
  return {
    id: "001",
    name: "Test Feature",
    status: "todo",
    statusDerived: null,
    featureSlug: "test-feature",
    description: "A test feature",
    taskRefs: [],
    source: "backlog.md",
    ...overrides,
  };
}

function makeFolder(overrides: Partial<FeatureFolder> = {}): FeatureFolder {
  return {
    slug: "test-feature",
    name: "Test Feature",
    status: "open",
    goal: "Test goal",
    tasks: [],
    source: "features/test-feature/index.md",
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "test-feature/001",
    slug: "task-one",
    name: "Task One",
    status: "todo",
    priority: "001",
    owner: null,
    featureId: "001",
    dependsOn: [],
    blocks: [],
    description: "A task",
    acceptanceCriteria: [],
    source: "features/test-feature/001-task-one.md",
    ...overrides,
  };
}

describe("crossLink", () => {
  it("links tasks to features via taskRefs", () => {
    const feature = makeFeature();
    const task1 = makeTask({ id: "test-feature/001", priority: "001" });
    const task2 = makeTask({
      id: "test-feature/002",
      priority: "002",
      slug: "task-two",
      name: "Task Two",
    });

    const result = crossLink([feature], [makeFolder()], [task1, task2]);

    expect(result.features[0].taskRefs).toEqual(["test-feature/001", "test-feature/002"]);
    expect(result.errors).toHaveLength(0);
  });

  it("errors when task references nonexistent feature", () => {
    const task = makeTask({ featureId: "999" });

    const result = crossLink([], [], [task]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("TASK_MISSING_FEATURE");
    expect(result.errors[0].message).toContain("999");
  });

  it("errors when feature references nonexistent folder", () => {
    const feature = makeFeature({ featureSlug: "nonexistent" });

    const result = crossLink([feature], [], []);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("FEATURE_MISSING_FOLDER");
    expect(result.errors[0].message).toContain("nonexistent");
  });

  it("does not error when featureSlug is null", () => {
    const feature = makeFeature({ featureSlug: null });

    const result = crossLink([feature], [], []);

    expect(result.errors).toHaveLength(0);
  });

  describe("status derivation", () => {
    it("derives todo when all tasks are todo", () => {
      const feature = makeFeature();
      const task = makeTask({ status: "todo" });

      const result = crossLink([feature], [makeFolder()], [task]);

      expect(result.features[0].statusDerived).toBe("todo");
    });

    it("derives done when all tasks are done", () => {
      const feature = makeFeature();
      const task1 = makeTask({ status: "done" });
      const task2 = makeTask({ id: "test-feature/002", status: "done" });

      const result = crossLink([feature], [makeFolder()], [task1, task2]);

      expect(result.features[0].statusDerived).toBe("done");
    });

    it("derives in-progress when any task is in-progress", () => {
      const feature = makeFeature();
      const task1 = makeTask({ status: "todo" });
      const task2 = makeTask({ id: "test-feature/002", status: "in-progress" });

      const result = crossLink([feature], [makeFolder()], [task1, task2]);

      expect(result.features[0].statusDerived).toBe("in-progress");
    });

    it("derives in-progress when any task is ready-to-review", () => {
      const feature = makeFeature();
      const task = makeTask({ status: "ready-to-review" });

      const result = crossLink([feature], [makeFolder()], [task]);

      expect(result.features[0].statusDerived).toBe("in-progress");
    });

    it("derives in-progress when any task is ready-to-test", () => {
      const feature = makeFeature();
      const task = makeTask({ status: "ready-to-test" });

      const result = crossLink([feature], [makeFolder()], [task]);

      expect(result.features[0].statusDerived).toBe("in-progress");
    });

    it("derives todo when feature has no tasks", () => {
      const feature = makeFeature();

      const result = crossLink([feature], [makeFolder()], []);

      expect(result.features[0].statusDerived).toBe("todo");
    });

    it("warns when declared status differs from derived", () => {
      const feature = makeFeature({ status: "todo" });
      const task = makeTask({ status: "in-progress" });

      const result = crossLink([feature], [makeFolder()], [task]);

      const warning = result.warnings.find((w) => w.code === "FEATURE_STATUS_MISMATCH");
      expect(warning).toBeDefined();
      expect(warning!.message).toContain("todo");
      expect(warning!.message).toContain("in-progress");
    });

    it("no warning when declared matches derived", () => {
      const feature = makeFeature({ status: "in-progress" });
      const task = makeTask({ status: "in-progress" });

      const result = crossLink([feature], [makeFolder()], [task]);

      const warning = result.warnings.find((w) => w.code === "FEATURE_STATUS_MISMATCH");
      expect(warning).toBeUndefined();
    });
  });

  describe("table-vs-file consistency", () => {
    it("warns on status mismatch between table and file", () => {
      const feature = makeFeature();
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

      const result = crossLink([feature], [folder], [task]);

      const warning = result.warnings.find((w) => w.code === "STATUS_MISMATCH");
      expect(warning).toBeDefined();
      expect(warning!.message).toContain("todo");
      expect(warning!.message).toContain("in-progress");
    });

    it("warns on owner mismatch between table and file", () => {
      const feature = makeFeature();
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

      const result = crossLink([feature], [folder], [task]);

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
      const feature = makeFeature();
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

      const result = crossLink([feature], [folder], [task]);

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
