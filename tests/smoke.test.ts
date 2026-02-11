import { describe, it, expect } from "vitest";
import { parseMd } from "@backlogmd/parser";

describe("smoke test", () => {
  it("parses a simple markdown heading", () => {
    const tree = parseMd("# Hello");
    expect(tree.type).toBe("root");
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe("heading");
  });

  it("parses a GFM table", () => {
    const md = `| A | B |\n|---|---|\n| 1 | 2 |`;
    const tree = parseMd(md);
    expect(tree.children[0].type).toBe("table");
  });
});
