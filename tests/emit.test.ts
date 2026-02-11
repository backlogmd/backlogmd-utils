import { describe, it, expect } from "vitest";
import { serializeOutput } from "@backlogmd/parser";
import type { BacklogOutput } from "@backlogmd/parser";

function makeOutput(overrides: Partial<BacklogOutput> = {}): BacklogOutput {
  return {
    protocol: "backlogmd/v1",
    generatedAt: "2026-01-01T00:00:00.000Z",
    rootDir: "/test/.backlogmd",
    items: [],
    itemFolders: [],
    tasks: [],
    validation: { errors: [], warnings: [] },
    ...overrides,
  };
}

describe("serializeOutput", () => {
  it("produces valid JSON with protocol and generatedAt", () => {
    const output = makeOutput();
    const json = JSON.parse(serializeOutput(output));

    expect(json.protocol).toBe("backlogmd/v1");
    expect(json.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(json.rootDir).toBe("/test/.backlogmd");
  });

  it("serializes items with type, statusDeclared/statusDerived and tasks as refs", () => {
    const output = makeOutput({
      items: [
        {
          id: "001",
          name: "Auth",
          type: "feature",
          status: "todo",
          statusDerived: "in-progress",
          itemSlug: "auth",
          description: "Auth feature",
          taskRefs: ["auth/001", "auth/002"],
          source: "backlog.md",
        },
      ],
    });

    const json = JSON.parse(serializeOutput(output));
    const item = json.items[0];

    expect(item.type).toBe("feature");
    expect(item.statusDeclared).toBe("todo");
    expect(item.statusDerived).toBe("in-progress");
    expect(item.slug).toBe("auth");
    expect(item.tasks).toEqual(["auth/001", "auth/002"]);
    expect(item.source).toBe("backlog.md");
    // Should NOT have internal field names
    expect(item.status).toBeUndefined();
    expect(item.itemSlug).toBeUndefined();
    expect(item.taskRefs).toBeUndefined();
  });

  it("serializes itemFolders with type and task priorities only", () => {
    const output = makeOutput({
      itemFolders: [
        {
          slug: "auth",
          name: "Auth",
          type: "feature",
          status: "open",
          goal: "Add auth",
          tasks: [
            {
              priority: "001",
              name: "Setup",
              fileName: "001-setup.md",
              status: "todo",
              owner: null,
              dependsOn: [],
            },
            {
              priority: "002",
              name: "Login",
              fileName: "002-login.md",
              status: "done",
              owner: "@bob",
              dependsOn: ["001"],
            },
          ],
          source: "items/auth/index.md",
        },
      ],
    });

    const json = JSON.parse(serializeOutput(output));
    const folder = json.itemFolders[0];

    expect(folder.tasks).toEqual(["001", "002"]);
    expect(folder.type).toBe("feature");
    expect(folder.slug).toBe("auth");
    expect(folder.source).toBe("items/auth/index.md");
  });

  it("serializes tasks with all fields including dependencies", () => {
    const output = makeOutput({
      tasks: [
        {
          id: "auth/001",
          slug: "setup",
          name: "Setup",
          status: "done",
          priority: "001",
          owner: "@alice",
          itemId: "001",
          dependsOn: [],
          blocks: ["auth/002"],
          description: "Set things up",
          acceptanceCriteria: [
            { text: "Works", checked: true },
            { text: "Tests pass", checked: false },
          ],
          source: "items/auth/001-setup.md",
        },
      ],
    });

    const json = JSON.parse(serializeOutput(output));
    const task = json.tasks[0];

    expect(task.id).toBe("auth/001");
    expect(task.itemId).toBe("001");
    expect(task.dependsOn).toEqual([]);
    expect(task.blocks).toEqual(["auth/002"]);
    expect(task.owner).toBe("@alice");
    expect(task.acceptanceCriteria).toHaveLength(2);
    expect(task.acceptanceCriteria[0].checked).toBe(true);
    expect(task.source).toBe("items/auth/001-setup.md");
  });

  it("serializes validation errors and warnings", () => {
    const output = makeOutput({
      validation: {
        errors: [{ code: "CIRCULAR_DEPENDENCY", message: "Cycle found", source: "task.md" }],
        warnings: [{ code: "STATUS_MISMATCH", message: "Mismatch", source: "index.md" }],
      },
    });

    const json = JSON.parse(serializeOutput(output));

    expect(json.validation.errors).toHaveLength(1);
    expect(json.validation.errors[0].code).toBe("CIRCULAR_DEPENDENCY");
    expect(json.validation.warnings).toHaveLength(1);
    expect(json.validation.warnings[0].code).toBe("STATUS_MISMATCH");
  });

  it("output is valid UTF-8 JSON", () => {
    const output = makeOutput({
      items: [
        {
          id: "001",
          name: "Ünïcödé Item",
          type: "feature",
          status: "todo",
          statusDerived: "todo",
          itemSlug: null,
          description: "Handles émojis 🎉",
          taskRefs: [],
          source: "backlog.md",
        },
      ],
    });

    const json = serializeOutput(output);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(json).toContain("Ünïcödé");
    expect(json).toContain("🎉");
  });
});
