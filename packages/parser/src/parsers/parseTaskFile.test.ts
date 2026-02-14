import { describe, it, expect } from "vitest";
import { parseTaskFile } from "./parseTaskFile.js";

const FULL_TASK = `<!-- METADATA -->

\`\`\`yaml
t: Setup Database
s: ip
p: 10
dep: ["001", "003"]
a: "agent-1"
h: true
expiresAt: "2026-02-13T15:00:00Z"
\`\`\`

<!-- DESCRIPTION -->

## Description

Set up the database schema and migrations.

This includes PostgreSQL setup.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [ ] Schema is defined
- [x] Migrations run successfully
- [ ] Seed data is loaded
`;

describe("parseTaskFile (SPEC v3)", () => {
  describe("valid task with all fields", () => {
    const task = parseTaskFile(FULL_TASK, "001-feat-auth", "work/001-feat-auth/002-setup-database.md");

    it("extracts the task title from metadata", () => {
      expect(task.name).toBe("Setup Database");
    });

    it("derives tid from source filename", () => {
      expect(task.tid).toBe("002");
    });

    it("derives slug from source filename", () => {
      expect(task.slug).toBe("setup-database");
    });

    it("extracts status", () => {
      expect(task.status).toBe("ip");
    });

    it("extracts priority as number", () => {
      expect(task.priority).toBe(10);
    });

    it("extracts itemSlug", () => {
      expect(task.itemSlug).toBe("001-feat-auth");
    });

    it("extracts dep as task ID strings", () => {
      expect(task.dependsOn).toEqual(["001", "003"]);
    });

    it("extracts agent", () => {
      expect(task.agent).toBe("agent-1");
    });

    it("extracts humanReview", () => {
      expect(task.humanReview).toBe(true);
    });

    it("extracts expiresAt", () => {
      expect(task.expiresAt).toBe("2026-02-13T15:00:00Z");
    });

    it("extracts description as raw markdown", () => {
      expect(task.description).toBe(
        "Set up the database schema and migrations.\n\nThis includes PostgreSQL setup.",
      );
    });

    it("extracts acceptance criteria with checked state", () => {
      expect(task.acceptanceCriteria).toEqual([
        { text: "Schema is defined", checked: false },
        { text: "Migrations run successfully", checked: true },
        { text: "Seed data is loaded", checked: false },
      ]);
    });

    it("preserves source", () => {
      expect(task.source).toBe("work/001-feat-auth/002-setup-database.md");
    });
  });

  describe("status parsing", () => {
    const statuses = ["plan", "open", "reserved", "ip", "review", "block", "done"] as const;

    for (const status of statuses) {
      it(`accepts valid status: ${status}`, () => {
        const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: ${status}\np: 1\n\`\`\`\n\n<!-- DESCRIPTION -->`;
        const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
        expect(task.status).toBe(status);
      });
    }

    it("throws on invalid status", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: invalid-status\np: 1\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      expect(() => parseTaskFile(md, "feat", "work/feat/001-task.md")).toThrow(
        /Invalid task status/,
      );
    });

    it("throws when s field is missing", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\np: 1\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      expect(() => parseTaskFile(md, "feat", "work/feat/001-task.md")).toThrow(
        /missing "s"/,
      );
    });
  });

  describe("dep parsing", () => {
    it("returns empty array for empty dep", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\ndep: []\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.dependsOn).toEqual([]);
    });

    it("returns empty array when dep is absent", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.dependsOn).toEqual([]);
    });

    it("parses single dependency", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 2\ndep: ["001"]\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/002-task.md");
      expect(task.dependsOn).toEqual(["001"]);
    });

    it("parses multiple dependencies", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 3\ndep: ["001", "002"]\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/003-task.md");
      expect(task.dependsOn).toEqual(["001", "002"]);
    });

    it("preserves zero-padded task IDs as strings", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 5\ndep: ["001", "003"]\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/005-task.md");
      expect(task.dependsOn).toEqual(["001", "003"]);
    });
  });

  describe("agent and human review", () => {
    it("parses agent field", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: reserved\np: 1\na: "alice"\nh: false\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.agent).toBe("alice");
    });

    it("defaults agent to empty string when absent", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.agent).toBe("");
    });

    it("parses h: true", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\nh: true\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.humanReview).toBe(true);
    });

    it("defaults humanReview to false when absent", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.humanReview).toBe(false);
    });

    it("parses expiresAt", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: reserved\np: 1\na: "bob"\nexpiresAt: "2026-02-13T15:00:00Z"\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.expiresAt).toBe("2026-02-13T15:00:00Z");
    });

    it("defaults expiresAt to null", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\nexpiresAt: null\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.expiresAt).toBeNull();
    });
  });

  describe("missing sections", () => {
    it("returns empty string for missing DESCRIPTION section", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\n\`\`\`\n\n<!-- ACCEPTANCE -->\n\n## Acceptance criteria\n\n- [ ] Something`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.description).toBe("");
    });

    it("returns empty array for missing ACCEPTANCE section", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\n\`\`\`\n\n<!-- DESCRIPTION -->\n\n## Description\n\nSome description.`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([]);
    });
  });

  describe("acceptance criteria checked states", () => {
    it("handles unchecked items", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\n\`\`\`\n\n<!-- ACCEPTANCE -->\n\n## Acceptance criteria\n\n- [ ] Not done`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([{ text: "Not done", checked: false }]);
    });

    it("handles checked items", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\n\`\`\`\n\n<!-- ACCEPTANCE -->\n\n## Acceptance criteria\n\n- [x] Done item`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([{ text: "Done item", checked: true }]);
    });

    it("handles mixed checked and unchecked", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\n\`\`\`\n\n<!-- ACCEPTANCE -->\n\n## Acceptance criteria\n\n- [ ] First\n- [x] Second\n- [ ] Third`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([
        { text: "First", checked: false },
        { text: "Second", checked: true },
        { text: "Third", checked: false },
      ]);
    });
  });

  describe("tid and slug derivation", () => {
    it("extracts tid and slug from filename", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-setup.md");
      expect(task.tid).toBe("001");
      expect(task.slug).toBe("setup");
    });

    it("handles multi-word slug", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 3\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/003-setup-database-schema.md");
      expect(task.tid).toBe("003");
      expect(task.slug).toBe("setup-database-schema");
    });
  });

  describe("YAML code block variants", () => {
    it("parses ```yaml fenced block", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`yaml\nt: Test\ns: open\np: 1\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.name).toBe("Test");
    });

    it("parses ``` fenced block without yaml tag", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nt: Test\ns: open\np: 1\n\`\`\`\n\n<!-- DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.name).toBe("Test");
    });
  });
});
