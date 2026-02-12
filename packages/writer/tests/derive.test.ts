import { describe, it, expect } from "vitest";
import { deriveItemStatus } from "@backlogmd/types";

describe("deriveItemStatus", () => {
  it("returns 'todo' for empty task list", () => {
    expect(deriveItemStatus([])).toBe("todo");
  });

  it("returns 'todo' when all tasks are todo", () => {
    expect(deriveItemStatus(["todo", "todo", "todo"])).toBe("todo");
  });

  it("returns 'done' when all tasks are done", () => {
    expect(deriveItemStatus(["done", "done"])).toBe("done");
  });

  it("returns 'in-progress' when tasks are mixed done and todo", () => {
    expect(deriveItemStatus(["done", "todo"])).toBe("in-progress");
  });

  it("returns 'in-progress' when any task is in-progress", () => {
    expect(deriveItemStatus(["todo", "in-progress", "done"])).toBe(
      "in-progress",
    );
  });

  it("returns 'in-progress' when any task is ready-to-review", () => {
    expect(deriveItemStatus(["todo", "ready-to-review"])).toBe("in-progress");
  });

  it("returns 'in-progress' when any task is ready-to-test", () => {
    expect(deriveItemStatus(["done", "ready-to-test"])).toBe("in-progress");
  });

  it("returns 'done' for a single done task", () => {
    expect(deriveItemStatus(["done"])).toBe("done");
  });

  it("returns 'todo' for a single todo task", () => {
    expect(deriveItemStatus(["todo"])).toBe("todo");
  });

  it("returns 'in-progress' for a single in-progress task", () => {
    expect(deriveItemStatus(["in-progress"])).toBe("in-progress");
  });
});
