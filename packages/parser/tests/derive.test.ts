import { describe, it, expect } from "vitest";
import { deriveItemStatus } from "../src/derive.js";

describe("deriveItemStatus (SPEC v2)", () => {
  it("returns 'open' for empty task list", () => {
    expect(deriveItemStatus([])).toBe("open");
  });

  it("returns 'open' when all tasks are open", () => {
    expect(deriveItemStatus(["open", "open", "open"])).toBe("open");
  });

  it("returns 'done' when all tasks are done", () => {
    expect(deriveItemStatus(["done", "done"])).toBe("done");
  });

  it("returns 'in-progress' when tasks are mixed done and open", () => {
    expect(deriveItemStatus(["done", "open"])).toBe("in-progress");
  });

  it("returns 'in-progress' when any task is in-progress", () => {
    expect(deriveItemStatus(["open", "in-progress", "done"])).toBe(
      "in-progress",
    );
  });

  it("returns 'in-progress' when any task is blocked", () => {
    expect(deriveItemStatus(["open", "block"])).toBe("in-progress");
  });

  it("returns 'done' for a single done task", () => {
    expect(deriveItemStatus(["done"])).toBe("done");
  });

  it("returns 'open' for a single open task", () => {
    expect(deriveItemStatus(["open"])).toBe("open");
  });

  it("returns 'in-progress' for a single in-progress task", () => {
    expect(deriveItemStatus(["in-progress"])).toBe("in-progress");
  });

  it("returns 'in-progress' for a single blocked task", () => {
    expect(deriveItemStatus(["block"])).toBe("in-progress");
  });
});
