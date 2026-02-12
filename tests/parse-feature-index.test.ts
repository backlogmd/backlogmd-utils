import { describe, it, expect } from "vitest";
import { parseItemIndex } from "../packages/parser/src/parse-item-index.js";

describe("parseItemIndex (SPEC v2)", () => {
  it("parses a valid item index with task references", () => {
    const md = `- [001-setup-auth](001-setup-auth.md)
- [002-login-page](002-login-page.md)
- [003-session-mgmt](003-session-mgmt.md)
`;

    const result = parseItemIndex(md, "001-feat-user-auth", "work/001-feat-user-auth/index.md");

    expect(result.slug).toBe("001-feat-user-auth");
<<<<<<< HEAD
=======
    expect(result.type).toBe("feat");
>>>>>>> 8c17d17 (v0.2)
    expect(result.source).toBe("work/001-feat-user-auth/index.md");
    expect(result.tasks).toHaveLength(3);

    expect(result.tasks[0]).toEqual({
      slug: "001-setup-auth",
      fileName: "001-setup-auth.md",
    });

    expect(result.tasks[1]).toEqual({
      slug: "002-login-page",
      fileName: "002-login-page.md",
    });

    expect(result.tasks[2]).toEqual({
      slug: "003-session-mgmt",
      fileName: "003-session-mgmt.md",
    });
  });

  it("returns empty tasks for empty content", () => {
    const result = parseItemIndex("", "empty", "work/empty/index.md");
    expect(result.tasks).toEqual([]);
  });

  it("returns empty tasks for content without lists", () => {
    const md = `# Some heading\n\nSome paragraph text.\n`;
    const result = parseItemIndex(md, "no-list", "work/no-list/index.md");
    expect(result.tasks).toEqual([]);
  });

<<<<<<< HEAD
  it("preserves slug and source", () => {
    const md = `- [001-task](001-task.md)\n`;
    const result = parseItemIndex(md, "my-item", "work/my-item/index.md");
    expect(result.slug).toBe("my-item");
=======
  it("preserves slug, type, and source", () => {
    const md = `- [001-task](001-task.md)\n`;
    const result = parseItemIndex(md, "my-item", "work/my-item/index.md");
    expect(result.slug).toBe("my-item");
    expect(result.type).toBeNull();
>>>>>>> 8c17d17 (v0.2)
    expect(result.source).toBe("work/my-item/index.md");
  });

  it("handles single task", () => {
    const md = `- [001-only-task](001-only-task.md)\n`;
    const result = parseItemIndex(md, "single", "work/single/index.md");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].slug).toBe("001-only-task");
    expect(result.tasks[0].fileName).toBe("001-only-task.md");
  });

  it("skips list items without links", () => {
    const md = `- [001-valid](001-valid.md)
- Plain text without link
- [002-also-valid](002-also-valid.md)
`;
    const result = parseItemIndex(md, "mixed", "work/mixed/index.md");
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].slug).toBe("001-valid");
    expect(result.tasks[1].slug).toBe("002-also-valid");
  });
});
