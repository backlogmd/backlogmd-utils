import { describe, it, expect } from "vitest";
import { deriveItemStatus } from "./derive.js";

describe("deriveItemStatus (SPEC v3)", () => {
  it("returns 'open' for empty task list", () => {
    expect(deriveItemStatus([])).toBe("open");
  });

  it("returns 'open' when all tasks are open", () => {
    expect(deriveItemStatus(["open", "open", "open"])).toBe("open");
  });

  it("returns 'open' when all tasks are plan", () => {
    expect(deriveItemStatus(["plan", "plan"])).toBe("open");
  });

  it("returns 'open' when all tasks are plan or open", () => {
    expect(deriveItemStatus(["plan", "open", "plan"])).toBe("open");
  });

  it("returns 'done' when all tasks are done", () => {
    expect(deriveItemStatus(["done", "done"])).toBe("done");
  });

  it("returns 'in-progress' when tasks are mixed done and open", () => {
    expect(deriveItemStatus(["done", "open"])).toBe("in-progress");
  });

  it("returns 'in-progress' when any task is ip", () => {
    expect(deriveItemStatus(["open", "ip", "done"])).toBe("in-progress");
  });

  it("returns 'in-progress' when any task is reserved", () => {
    expect(deriveItemStatus(["open", "reserved"])).toBe("in-progress");
  });

  it("returns 'in-progress' when any task is review", () => {
    expect(deriveItemStatus(["open", "review"])).toBe("in-progress");
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

  it("returns 'open' for a single plan task", () => {
    expect(deriveItemStatus(["plan"])).toBe("open");
  });

  it("returns 'in-progress' for a single ip task", () => {
    expect(deriveItemStatus(["ip"])).toBe("in-progress");
  });

  it("returns 'in-progress' for a single blocked task", () => {
    expect(deriveItemStatus(["block"])).toBe("in-progress");
  });

  it("returns 'in-progress' for a single reserved task", () => {
    expect(deriveItemStatus(["reserved"])).toBe("in-progress");
  });

  it("returns 'in-progress' for a single review task", () => {
    expect(deriveItemStatus(["review"])).toBe("in-progress");
  });
});
