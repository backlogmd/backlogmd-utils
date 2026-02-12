import { describe, it, expect } from "vitest";
import { parseTaskFile } from "../packages/parser/src/parse-task-file.js";

const FULL_TASK = `<!-- METADATA -->

\`\`\`
Task: Setup Database
Status: in-progress
Priority: 002
DependsOn: [001-init](001-init.md), [002-config](002-config.md)
\`\`\`

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Set up the database schema and migrations.

This includes PostgreSQL setup.

<!-- /DESCRIPTION -->
<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [ ] Schema is defined
- [x] Migrations run successfully
- [ ] Seed data is loaded

<!-- /ACCEPTANCE CRITERIA -->
`;

describe("parseTaskFile (SPEC v2)", () => {
  describe("valid task with all fields", () => {
    const task = parseTaskFile(FULL_TASK, "auth", "work/auth/002-setup-database.md");

    it("extracts the task name from metadata", () => {
      expect(task.name).toBe("Setup Database");
    });

    it("derives slug from source filename", () => {
      expect(task.slug).toBe("setup-database");
    });

    it("extracts status", () => {
      expect(task.status).toBe("in-progress");
    });

    it("extracts priority", () => {
      expect(task.priority).toBe("002");
    });

    it("extracts itemSlug", () => {
      expect(task.itemSlug).toBe("auth");
    });

    it("extracts dependsOn as link texts", () => {
      expect(task.dependsOn).toEqual(["001-init", "002-config"]);
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
      expect(task.source).toBe("work/auth/002-setup-database.md");
    });
  });

  describe("status parsing", () => {
    const statuses = ["open", "block", "in-progress", "done"] as const;

    for (const status of statuses) {
      it(`accepts valid status: ${status}`, () => {
        const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: ${status}\nPriority: 001\nDependsOn: —\n\`\`\`\n\n<!-- /METADATA -->`;
        const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
        expect(task.status).toBe(status);
      });
    }

    it("throws on invalid status", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: invalid-status\nPriority: 001\nDependsOn: —\n\`\`\`\n\n<!-- /METADATA -->`;
      expect(() => parseTaskFile(md, "feat", "work/feat/001-task.md")).toThrow(
        /Invalid task status/,
      );
    });

    it("throws when Status field is missing", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nPriority: 001\n\`\`\`\n\n<!-- /METADATA -->`;
      expect(() => parseTaskFile(md, "feat", "work/feat/001-task.md")).toThrow(
        /missing "Status" field/,
      );
    });
  });

  describe("depends on parsing", () => {
    it("returns empty array for em dash", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: open\nPriority: 001\nDependsOn: —\n\`\`\`\n\n<!-- /METADATA -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.dependsOn).toEqual([]);
    });

    it("returns empty array when DependsOn is absent", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: open\nPriority: 001\n\`\`\`\n\n<!-- /METADATA -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.dependsOn).toEqual([]);
    });

    it("parses single dependency link", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: open\nPriority: 002\nDependsOn: [001-setup](001-setup.md)\n\`\`\`\n\n<!-- /METADATA -->`;
      const task = parseTaskFile(md, "feat", "work/feat/002-task.md");
      expect(task.dependsOn).toEqual(["001-setup"]);
    });

    it("parses multiple dependency links", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: open\nPriority: 003\nDependsOn: [001-a](001-a.md), [002-b](002-b.md)\n\`\`\`\n\n<!-- /METADATA -->`;
      const task = parseTaskFile(md, "feat", "work/feat/003-task.md");
      expect(task.dependsOn).toEqual(["001-a", "002-b"]);
    });
  });

  describe("missing sections", () => {
    it("returns empty string for missing DESCRIPTION section", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: open\nPriority: 001\n\`\`\`\n\n<!-- /METADATA -->\n<!-- ACCEPTANCE CRITERIA -->\n\n## Acceptance criteria\n\n- [ ] Something\n\n<!-- /ACCEPTANCE CRITERIA -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.description).toBe("");
    });

    it("returns empty array for missing ACCEPTANCE CRITERIA section", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: open\nPriority: 001\n\`\`\`\n\n<!-- /METADATA -->\n<!-- DESCRIPTION -->\n\n## Description\n\nSome description.\n\n<!-- /DESCRIPTION -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([]);
    });
  });

  describe("acceptance criteria checked states", () => {
    it("handles unchecked items", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: open\nPriority: 001\n\`\`\`\n\n<!-- /METADATA -->\n<!-- ACCEPTANCE CRITERIA -->\n\n## Acceptance criteria\n\n- [ ] Not done\n\n<!-- /ACCEPTANCE CRITERIA -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([{ text: "Not done", checked: false }]);
    });

    it("handles checked items", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: open\nPriority: 001\n\`\`\`\n\n<!-- /METADATA -->\n<!-- ACCEPTANCE CRITERIA -->\n\n## Acceptance criteria\n\n- [x] Done item\n\n<!-- /ACCEPTANCE CRITERIA -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([{ text: "Done item", checked: true }]);
    });

    it("handles mixed checked and unchecked", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: open\nPriority: 001\n\`\`\`\n\n<!-- /METADATA -->\n<!-- ACCEPTANCE CRITERIA -->\n\n## Acceptance criteria\n\n- [ ] First\n- [x] Second\n- [ ] Third\n\n<!-- /ACCEPTANCE CRITERIA -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([
        { text: "First", checked: false },
        { text: "Second", checked: true },
        { text: "Third", checked: false },
      ]);
    });
  });

  describe("slug derivation", () => {
    it("removes priority prefix from filename", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: open\nPriority: 001\n\`\`\`\n\n<!-- /METADATA -->`;
      const task = parseTaskFile(md, "feat", "work/feat/001-setup.md");
      expect(task.slug).toBe("setup");
    });

    it("handles multi-word slug", () => {
      const md = `<!-- METADATA -->\n\n\`\`\`\nTask: Test\nStatus: open\nPriority: 003\n\`\`\`\n\n<!-- /METADATA -->`;
      const task = parseTaskFile(md, "feat", "work/feat/003-setup-database-schema.md");
      expect(task.slug).toBe("setup-database-schema");
    });
  });
});
