import { describe, it, expect } from "vitest";
import { parseBacklog } from "@backlogmd/parser";

const SOURCE = ".backlogmd/backlog.md";

function makeBacklog(...featureBlocks: string[]): string {
  return `# Roadmap

## Features

${featureBlocks.join("\n\n")}
`;
}

function featureBlock(
  id: string,
  name: string,
  status: string,
  feature: string,
  description: string,
): string {
  return `### ${id} - ${name}
- **Status:** ${status}
- **Feature:** ${feature}
- **Description:** ${description}`;
}

describe("parseBacklog", () => {
  describe("multiple features parsed correctly", () => {
    it("parses two well-formed features", () => {
      const md = makeBacklog(
        featureBlock(
          "001",
          "User Authentication",
          "todo",
          "[User Authentication](features/user-auth/index.md)",
          "Allow users to log in",
        ),
        featureBlock(
          "002",
          "Dashboard",
          "done",
          "[Dashboard](features/dashboard/index.md)",
          "Main dashboard view",
        ),
      );

      const result = parseBacklog(md, SOURCE);
      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        id: "001",
        name: "User Authentication",
        status: "todo",
        statusDerived: null,
        taskRefs: [],
        featureSlug: "user-auth",
        description: "Allow users to log in",
        source: SOURCE,
      });

      expect(result[1]).toEqual({
        id: "002",
        name: "Dashboard",
        status: "done",
        statusDerived: null,
        taskRefs: [],
        featureSlug: "dashboard",
        description: "Main dashboard view",
        source: SOURCE,
      });
    });

    it("returns empty array when no ## Features section exists", () => {
      const md = `# Roadmap\n\nSome content.\n`;
      expect(parseBacklog(md, SOURCE)).toEqual([]);
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
        featureBlock("001", "Test Feature", input, "[Test](features/test/index.md)", "A test"),
      );
      const result = parseBacklog(md, SOURCE);
      expect(result[0].status).toBe(expected);
    });

    it("throws on unknown status", () => {
      const md = makeBacklog(
        featureBlock("001", "Test Feature", "blocked", "[Test](features/test/index.md)", "A test"),
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/Unknown status.*"blocked"/);
    });
  });

  describe("feature slug extraction", () => {
    it("extracts slug from a valid feature link", () => {
      const md = makeBacklog(
        featureBlock(
          "001",
          "My Feature",
          "todo",
          "[My Feature](features/my-feature/index.md)",
          "Does things",
        ),
      );
      const result = parseBacklog(md, SOURCE);
      expect(result[0].featureSlug).toBe("my-feature");
    });

    it("handles hyphenated slugs", () => {
      const md = makeBacklog(
        featureBlock(
          "001",
          "Complex Feature Name",
          "todo",
          "[Complex Feature Name](features/complex-feature-name/index.md)",
          "Does things",
        ),
      );
      const result = parseBacklog(md, SOURCE);
      expect(result[0].featureSlug).toBe("complex-feature-name");
    });
  });

  describe("em dash for no feature folder", () => {
    it("returns null featureSlug for em dash", () => {
      const md = makeBacklog(
        featureBlock("001", "Planned Feature", "todo", "\u2014", "Not started yet"),
      );
      const result = parseBacklog(md, SOURCE);
      expect(result[0].featureSlug).toBeNull();
    });
  });

  describe("missing fields produce errors", () => {
    it("throws when Status is missing", () => {
      const md = makeBacklog(
        `### 001 - Missing Status
- **Feature:** [Test](features/test/index.md)
- **Description:** A test`,
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Status field/);
    });

    it("throws when Feature is missing", () => {
      const md = makeBacklog(
        `### 001 - Missing Feature
- **Status:** todo
- **Description:** A test`,
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Feature field/);
    });

    it("throws when Description is missing", () => {
      const md = makeBacklog(
        `### 001 - Missing Desc
- **Status:** todo
- **Feature:** [Test](features/test/index.md)`,
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Description field/);
    });

    it("collects multiple missing fields in one error", () => {
      const md = makeBacklog(`### 001 - All Missing`);
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Status field/);
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Feature field/);
      expect(() => parseBacklog(md, SOURCE)).toThrow(/missing Description field/);
    });
  });

  describe("malformed headers", () => {
    it("errors on heading without NNN pattern", () => {
      const md = makeBacklog(
        `### No Number Here
- **Status:** todo
- **Feature:** [Test](features/test/index.md)
- **Description:** A test`,
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/Malformed feature heading/);
    });

    it("errors on heading with non-zero-padded number", () => {
      const md = makeBacklog(
        `### 1 - Short Number
- **Status:** todo
- **Feature:** [Test](features/test/index.md)
- **Description:** A test`,
      );
      expect(() => parseBacklog(md, SOURCE)).toThrow(/Malformed feature heading/);
    });

    it("skips malformed heading but still parses valid ones after it", () => {
      const md = makeBacklog(
        `### Bad Heading`,
        featureBlock("001", "Good Feature", "todo", "[Good](features/good/index.md)", "Works fine"),
      );
      // Both the malformed heading error and the good feature are processed;
      // since there's an error, it throws
      expect(() => parseBacklog(md, SOURCE)).toThrow(/Malformed feature heading/);
    });
  });

  describe("source is passed through", () => {
    it("attaches the source to each feature", () => {
      const customSource = "path/to/my/backlog.md";
      const md = makeBacklog(
        featureBlock("001", "Feature", "todo", "[Feature](features/feat/index.md)", "Desc"),
      );
      const result = parseBacklog(md, customSource);
      expect(result[0].source).toBe(customSource);
    });
  });

  describe("features section boundary", () => {
    it("stops parsing at the next h2 section", () => {
      const md = `# Roadmap

## Features

### 001 - First
- **Status:** todo
- **Feature:** [First](features/first/index.md)
- **Description:** First feature

## Other Section

### 002 - Should Not Parse
- **Status:** done
- **Feature:** [Second](features/second/index.md)
- **Description:** Under different section
`;
      const result = parseBacklog(md, SOURCE);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("001");
    });
  });
});
