import { describe, it, expect } from "vitest";
import { parseTaskFile } from "@backlogmd/parser";

const FULL_TASK = `# Setup Database

- **Status:** in-progress
- **Priority:** 002
- **Owner:** alice
- **Feature:** [Auth Feature](../../backlog.md#001---auth-feature)
- **Depends on:** [001-init](../common/001-init.md), [002-config](../common/002-config.md)
- **Blocks:** [003-api](./003-api.md)

## Description

Set up the database schema and migrations.

This includes PostgreSQL setup.

## Acceptance Criteria

- [ ] Schema is defined
- [x] Migrations run successfully
- [ ] Seed data is loaded
`;

describe("parseTaskFile", () => {
  describe("valid task with all fields", () => {
    const task = parseTaskFile(FULL_TASK, "auth", "features/auth/002-setup-database.md");

    it("extracts the task name from h1", () => {
      expect(task.name).toBe("Setup Database");
    });

    it("derives id from featureSlug and priority", () => {
      expect(task.id).toBe("auth/002");
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

    it("extracts owner", () => {
      expect(task.owner).toBe("alice");
    });

    it("extracts featureId from anchor link", () => {
      expect(task.featureId).toBe("001");
    });

    it("extracts dependsOn as link texts", () => {
      expect(task.dependsOn).toEqual(["001-init", "002-config"]);
    });

    it("extracts blocks as link texts", () => {
      expect(task.blocks).toEqual(["003-api"]);
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
      expect(task.source).toBe("features/auth/002-setup-database.md");
    });
  });

  describe("status parsing", () => {
    const statuses = ["todo", "in-progress", "ready-to-review", "ready-to-test", "done"] as const;

    for (const status of statuses) {
      it(`accepts valid status: ${status}`, () => {
        const md = `# Task\n\n- **Status:** ${status}\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n`;
        const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
        expect(task.status).toBe(status);
      });
    }

    it("throws on invalid status", () => {
      const md = `# Task\n\n- **Status:** invalid-status\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n`;
      expect(() => parseTaskFile(md, "feat", "features/feat/001-task.md")).toThrow(
        /Invalid task status/,
      );
    });

    it("throws when status field is missing", () => {
      const md = `# Task\n\n- **Priority:** 001\n- **Owner:** —\n`;
      expect(() => parseTaskFile(md, "feat", "features/feat/001-task.md")).toThrow(
        /missing Status/,
      );
    });
  });

  describe("owner parsing", () => {
    it("returns null for em dash owner", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.owner).toBeNull();
    });

    it("returns the owner handle when present", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** bob\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.owner).toBe("bob");
    });
  });

  describe("feature ID extraction", () => {
    it("extracts numeric ID from anchor with triple dash", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [My Feature](../../backlog.md#042---my-feature-name)\n- **Depends on:** —\n- **Blocks:** —\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.featureId).toBe("042");
    });
  });

  describe("depends on and blocks", () => {
    it("returns empty array for em dash depends on", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.dependsOn).toEqual([]);
    });

    it("returns empty array for em dash blocks", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.blocks).toEqual([]);
    });

    it("parses multiple dependency links", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** [task-a](./001-task-a.md), [task-b](./002-task-b.md)\n- **Blocks:** —\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.dependsOn).toEqual(["task-a", "task-b"]);
    });

    it("parses single block link", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** [next-task](./002-next-task.md)\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.blocks).toEqual(["next-task"]);
    });
  });

  describe("missing sections", () => {
    it("returns empty string for missing Description section", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n\n## Acceptance Criteria\n\n- [ ] Something\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.description).toBe("");
    });

    it("returns empty array for missing Acceptance Criteria section", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n\n## Description\n\nSome description.\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([]);
    });

    it("handles missing both Description and Acceptance Criteria", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.description).toBe("");
      expect(task.acceptanceCriteria).toEqual([]);
    });
  });

  describe("acceptance criteria checked states", () => {
    it("handles unchecked items with [ ]", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n\n## Acceptance Criteria\n\n- [ ] Not done yet\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([{ text: "Not done yet", checked: false }]);
    });

    it("handles checked items with [x]", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n\n## Acceptance Criteria\n\n- [x] Done item\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([{ text: "Done item", checked: true }]);
    });

    it("handles checked items with [X] (uppercase)", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n\n## Acceptance Criteria\n\n- [X] Done uppercase\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([{ text: "Done uppercase", checked: true }]);
    });

    it("handles mixed checked and unchecked", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n\n## Acceptance Criteria\n\n- [ ] First\n- [x] Second\n- [ ] Third\n- [X] Fourth\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-task.md");
      expect(task.acceptanceCriteria).toEqual([
        { text: "First", checked: false },
        { text: "Second", checked: true },
        { text: "Third", checked: false },
        { text: "Fourth", checked: true },
      ]);
    });
  });

  describe("slug derivation", () => {
    it("removes priority prefix from filename", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n`;
      const task = parseTaskFile(md, "feat", "features/feat/001-setup.md");
      expect(task.slug).toBe("setup");
    });

    it("handles multi-word slug", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 003\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n`;
      const task = parseTaskFile(md, "feat", "features/feat/003-setup-database-schema.md");
      expect(task.slug).toBe("setup-database-schema");
    });

    it("returns full basename if no priority prefix", () => {
      const md = `# Task\n\n- **Status:** todo\n- **Priority:** 001\n- **Owner:** —\n- **Feature:** [F](../../backlog.md#001---f)\n- **Depends on:** —\n- **Blocks:** —\n`;
      const task = parseTaskFile(md, "feat", "features/feat/my-task.md");
      expect(task.slug).toBe("my-task");
    });
  });
});
