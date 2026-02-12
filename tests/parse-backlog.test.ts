import { describe, it, expect } from "vitest";
import { parseBacklog } from "../packages/parser/src/parse-backlog.js";

const SOURCE = ".backlogmd/backlog.md";

describe("parseBacklog (SPEC v2)", () => {
  describe("basic parsing", () => {
    it("parses a single entry", () => {
      const md = `- [001-feat-user-auth](work/001-feat-user-auth/index.md)\n`;
      const result = parseBacklog(md, SOURCE);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        slug: "001-feat-user-auth",
        type: "feat",
        source: SOURCE,
      });
    });

    it("parses multiple entries in order", () => {
      const md = `- [001-feat-user-auth](work/001-feat-user-auth/index.md)
- [002-fix-dashboard](work/002-fix-dashboard/index.md)
- [003-chore-cleanup](work/003-chore-cleanup/index.md)
`;
      const result = parseBacklog(md, SOURCE);
      expect(result).toHaveLength(3);
      expect(result[0].slug).toBe("001-feat-user-auth");
      expect(result[0].type).toBe("feat");
      expect(result[1].slug).toBe("002-fix-dashboard");
      expect(result[1].type).toBe("fix");
      expect(result[2].slug).toBe("003-chore-cleanup");
      expect(result[2].type).toBe("chore");
    });

    it("returns empty array for empty content", () => {
      expect(parseBacklog("", SOURCE)).toEqual([]);
    });

    it("returns empty array for content with no lists", () => {
      expect(parseBacklog("# Backlog\n\nSome text.\n", SOURCE)).toEqual([]);
    });
  });

  describe("slug extraction", () => {
    it("extracts slug from work/ URL pattern", () => {
      const md = `- [001-feat-xyz](work/001-feat-xyz/index.md)\n`;
      const result = parseBacklog(md, SOURCE);
      expect(result[0].slug).toBe("001-feat-xyz");
    });

    it("handles slugs without type segment", () => {
      const md = `- [001-project-foundation](work/001-project-foundation/index.md)\n`;
      const result = parseBacklog(md, SOURCE);
      expect(result[0].slug).toBe("001-project-foundation");
      expect(result[0].type).toBeNull();
    });

    it("falls back to link text if URL pattern doesn't match", () => {
      const md = `- [my-custom-slug](some/other/path.md)\n`;
      const result = parseBacklog(md, SOURCE);
      expect(result[0].slug).toBe("my-custom-slug");
    });
  });

  describe("source passthrough", () => {
    it("attaches the source to each entry", () => {
      const customSource = "path/to/backlog.md";
      const md = `- [001-feat](work/001-feat/index.md)\n`;
      const result = parseBacklog(md, customSource);
      expect(result[0].source).toBe(customSource);
    });
  });
});
