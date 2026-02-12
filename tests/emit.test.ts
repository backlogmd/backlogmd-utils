import { describe, it, expect } from "vitest";
import { serializeOutput } from "@backlogmd/parser";
import type { BacklogOutput } from "@backlogmd/parser";

function makeOutput(overrides: Partial<BacklogOutput> = {}): BacklogOutput {
  return {
    protocol: "backlogmd/v2",
    generatedAt: "2026-01-01T00:00:00.000Z",
    rootDir: "/test/.backlogmd",
    entries: [],
    items: [],
    tasks: [],
    validation: { errors: [], warnings: [] },
    ...overrides,
  };
}

describe("serializeOutput (SPEC v2)", () => {
  it("produces valid JSON with protocol and generatedAt", () => {
    const output = makeOutput();
    const json = JSON.parse(serializeOutput(output));

    expect(json.protocol).toBe("backlogmd/v2");
    expect(json.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(json.rootDir).toBe("/test/.backlogmd");
  });

  it("serializes entries as simple slug objects", () => {
    const output = makeOutput({
      entries: [
        { slug: "001-feat-auth", type: "feat", source: "backlog.md" },
        { slug: "002-fix-dashboard", type: "fix", source: "backlog.md" },
      ],
    });

    const json = JSON.parse(serializeOutput(output));
    expect(json.entries).toHaveLength(2);
    expect(json.entries[0].slug).toBe("001-feat-auth");
    expect(json.entries[1].slug).toBe("002-fix-dashboard");
  });

  it("serializes items with task refs", () => {
    const output = makeOutput({
      items: [
        {
          slug: "001-feat-auth",
          type: "feat",
          tasks: [
            { slug: "001-setup", fileName: "001-setup.md" },
            { slug: "002-login", fileName: "002-login.md" },
          ],
          source: "work/001-feat-auth/index.md",
        },
      ],
    });

    const json = JSON.parse(serializeOutput(output));
    expect(json.items[0].slug).toBe("001-feat-auth");
    expect(json.items[0].tasks).toHaveLength(2);
    expect(json.items[0].tasks[0].slug).toBe("001-setup");
  });

  it("serializes tasks with all fields", () => {
    const output = makeOutput({
      tasks: [
        {
          name: "Setup",
          status: "done",
          priority: "001",
          slug: "setup",
          itemSlug: "001-feat-auth",
          dependsOn: [],
          description: "Set things up",
          acceptanceCriteria: [
            { text: "Works", checked: true },
            { text: "Tests pass", checked: false },
          ],
          source: "work/001-feat-auth/001-setup.md",
        },
      ],
    });

    const json = JSON.parse(serializeOutput(output));
    const task = json.tasks[0];

    expect(task.name).toBe("Setup");
    expect(task.status).toBe("done");
    expect(task.itemSlug).toBe("001-feat-auth");
    expect(task.dependsOn).toEqual([]);
    expect(task.acceptanceCriteria).toHaveLength(2);
    expect(task.source).toBe("work/001-feat-auth/001-setup.md");
  });

  it("serializes validation errors and warnings", () => {
    const output = makeOutput({
      validation: {
        errors: [{ code: "CIRCULAR_DEPENDENCY", message: "Cycle found", source: "task.md" }],
        warnings: [{ code: "ORPHAN_FOLDER", message: "Orphan", source: "index.md" }],
      },
    });

    const json = JSON.parse(serializeOutput(output));
    expect(json.validation.errors).toHaveLength(1);
    expect(json.validation.errors[0].code).toBe("CIRCULAR_DEPENDENCY");
    expect(json.validation.warnings).toHaveLength(1);
  });

  it("output is valid UTF-8 JSON", () => {
    const output = makeOutput({
      entries: [{ slug: "001-feat-ünïcödé", type: "feat", source: "backlog.md" }],
    });

    const json = serializeOutput(output);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(json).toContain("ünïcödé");
  });
});
