import { describe, it, expect } from "vitest";
import { parseBacklog } from "../packages/parser/src/parse-backlog.js";

const SOURCE = ".backlogmd/backlog.md";

function makeBacklog(...itemBlocks: string[]): string {
  return `# Roadmap

## Items

${itemBlocks.join("\n\n")}
`;
}

function itemBlock(
  id: string,
  name: string,
  type: string,
  status: string,
  item: string,
  description: string,
): string {
  return `### ${id} - ${name}
- **Type:** ${type}
- **Status:** ${status}
- **Item:** ${item}
- **Description:** ${description}`;
}

describe("parseBacklog", () => {
  describe("multiple items parsed correctly", () => {
    it("parses two well-formed items", () => {
      const md = makeBacklog(
        itemBlock(
          "001",
          "User Authentication",
          "feature",
          "todo",
          "[User Authentication](items/user-auth/index.md)",
          "Allow users to log in",
        ),
        itemBlock(
          "002",
          "Dashboard",
          "bugfix",
          "done",
          "[Dashboard](items/dashboard/index.md)",
          "Main dashboard view",
        ),
      );

      const result = parseBacklog(md, SOURCE);
      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        id: "001",
        name: "User Authentication",
        type: "feature",
        status: "todo",
        statusDerived: null,
        taskRefs: [],
        itemSlug: "user-auth",
        description: "Allow users to log in",
        source: SOURCE,
      });

      expect(result[1]).toEqual({
        id: "002",
        name: "Dashboard",
        type: "bugfix",
        status: "done",
        statusDerived: null,
        taskRefs: [],
        itemSlug: "dashboard",
        description: "Main dashboard view",
        source: SOURCE,
      });
    });

    it("returns empty array when no ## Items section exists", () => {
      const md = `# Roadmap\n\nSome content.\n`;
      expect(parseBacklog(md, SOURCE)).toEqual([]);
    });
  });

  describe("type parsing", () => {
    it.each([
      ["feature", "feature"],
      ["bugfix", "bugfix"],
      ["refactor", "refactor"],
      ["chore", "chore"],
      ["Feature", "feature"],
      ["BUGFIX", "bugfix"],
    ] as const)("normalizes '%s' to '%s'", (input, expected) => {
      const md = makeBacklog(
        itemBlock("001", "Test Item", input, "todo", "[Test](items/test/index.md)", "A test"),
      );
      const result = parseBacklog(md, SOURCE);
      expect(result[0].type).toBe(expected);
    });

    it("throws on unknown type", () => {
      const md = makeBacklog(
        itemBlock("001", "Test Item", "epic", "todo", "[Test](items/test/index.md)", "A test"),
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/Unknown type.*"epic"/);
    });
  });

  describe("status normalization", () => {
    it.each([
      ["todo", "todo"],
      ["to do", "todo"],
      ["to-do", "todo"],
      ["in-progress", "in-progress"],
      ["in progress", "in-progress"],
      ["wip", "in-progress"],
      ["done", "done"],
      ["complete", "done"],
      ["completed", "done"],
      ["Todo", "todo"],
      ["In-Progress", "in-progress"],
      ["Done", "done"],
      ["WIP", "in-progress"],
    ] as const)("normalizes '%s' to '%s'", (input, expected) => {
      const md = makeBacklog(
        itemBlock("001", "Test Item", "feature", input, "[Test](items/test/index.md)", "A test"),
      );
      const result = parseBacklog(md, SOURCE);
      expect(result[0].status).toBe(expected);
    });

    it("throws on unknown status", () => {
      const md = makeBacklog(
        itemBlock("001", "Test Item", "feature", "blocked", "[Test](items/test/index.md)", "A test"),
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/Unknown status.*"blocked"/);
    });
  });

  describe("item slug extraction", () => {
    it("extracts slug from a valid item link", () => {
      const md = makeBacklog(
        itemBlock(
          "001",
          "My Feature",
          "feature",
          "todo",
          "[My Feature](items/my-feature/index.md)",
          "Does things",
        ),
      );
      const result = parseBacklog(md, SOURCE);
      expect(result[0].itemSlug).toBe("my-feature");
    });

    it("handles hyphenated slugs", () => {
      const md = makeBacklog(
        itemBlock(
          "001",
          "Complex Feature Name",
          "feature",
          "todo",
          "[Complex Feature Name](items/complex-feature-name/index.md)",
          "Does things",
        ),
      );
      const result = parseBacklog(md, SOURCE);
      expect(result[0].itemSlug).toBe("complex-feature-name");
    });
  });

  describe("em dash for no item folder", () => {
    it("returns null itemSlug for em dash", () => {
      const md = makeBacklog(
        itemBlock("001", "Planned Feature", "feature", "todo", "\u2014", "Not started yet"),
      );
      const result = parseBacklog(md, SOURCE);
      expect(result[0].itemSlug).toBeNull();
    });
  });

  describe("missing fields produce errors", () => {
    it("throws when Type is missing", () => {
      const md = makeBacklog(
        `### 001 - Missing Type
- **Status:** todo
- **Item:** [Test](items/test/index.md)
- **Description:** A test`,
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Type field/);
    });

    it("throws when Status is missing", () => {
      const md = makeBacklog(
        `### 001 - Missing Status
- **Type:** feature
- **Item:** [Test](items/test/index.md)
- **Description:** A test`,
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Status field/);
    });

    it("throws when Item is missing", () => {
      const md = makeBacklog(
        `### 001 - Missing Item
- **Type:** feature
- **Status:** todo
- **Description:** A test`,
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Item field/);
    });

    it("throws when Description is missing", () => {
      const md = makeBacklog(
        `### 001 - Missing Desc
- **Type:** feature
- **Status:** todo
- **Item:** [Test](items/test/index.md)`,
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Description field/);
    });

    it("collects multiple missing fields in one error", () => {
      const md = makeBacklog(`### 001 - All Missing`);
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Type field/);
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Status field/);
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Item field/);
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Description field/);
    });
  });

  describe("malformed headers", () => {
    it("errors on heading without NNN pattern", () => {
      const md = makeBacklog(
        `### No Number Here
- **Type:** feature
- **Status:** todo
- **Item:** [Test](items/test/index.md)
- **Description:** A test`,
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/Malformed item heading/);
    });

    it("errors on heading with non-zero-padded number", () => {
      const md = makeBacklog(
        `### 1 - Short Number
- **Type:** feature
- **Status:** todo
- **Item:** [Test](items/test/index.md)
- **Description:** A test`,
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/Malformed item heading/);
    });

    it("skips malformed heading but still parses valid ones after it", () => {
      const md = makeBacklog(
        `### Bad Heading`,
        itemBlock("001", "Good Feature", "feature", "todo", "[Good](items/good/index.md)", "Works fine"),
      );
      // Both the malformed heading error and the good item are processed;
      // since there's an error, it throws
      expect(() => parseBacklog(md, SOURCE)).toThrow(/Malformed item heading/);
    });
  });

  describe("source is passed through", () => {
    it("attaches the source to each item", () => {
      const customSource = "path/to/my/backlog.md";
      const md = makeBacklog(
        itemBlock("001", "Feature", "feature", "todo", "[Feature](items/feat/index.md)", "Desc"),
      );
      const result = parseBacklog(md, customSource);
      expect(result[0].source).toBe(customSource);
    });
  });

  describe("items section boundary", () => {
    it("stops parsing at the next h2 section", () => {
      const md = `# Roadmap

## Items

### 001 - First
- **Type:** feature
- **Status:** todo
- **Item:** [First](items/first/index.md)
- **Description:** First item

## Other Section

### 002 - Should Not Parse
- **Type:** feature
- **Status:** done
- **Item:** [Second](items/second/index.md)
- **Description:** Under different section
`;
      const result = parseBacklog(md, SOURCE);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("001");
    });
  });
});
