import { describe, it, expect } from "vitest";
import path from "node:path";
import { buildBacklogOutput, serializeOutput } from "@backlogmd/parser";

const FIXTURES = path.resolve(__dirname, "fixtures");

describe("integration: happy-path fixture (SPEC v2)", () => {
  const output = buildBacklogOutput(path.join(FIXTURES, "happy-path"));

  it("has correct protocol version", () => {
    expect(output.protocol).toBe("backlogmd/v2");
  });

  it("parses one backlog entry with type", () => {
    expect(output.entries).toHaveLength(1);
    expect(output.entries[0].slug).toBe("001-feat-my-feature");
    expect(output.entries[0].type).toBe("feat");
  });

  it("parses one item folder with two task refs", () => {
    expect(output.items).toHaveLength(1);

    const item = output.items[0];
    expect(item.slug).toBe("001-feat-my-feature");
    expect(item.type).toBe("feat");
    expect(item.tasks).toHaveLength(2);
    expect(item.tasks[0].slug).toBe("001-setup-project");
    expect(item.tasks[1].slug).toBe("002-add-login");
  });

  it("parses two tasks with correct data", () => {
    expect(output.tasks).toHaveLength(2);

    const t1 = output.tasks.find((t) => t.priority === "001")!;
    expect(t1.name).toBe("Setup project");
    expect(t1.status).toBe("done");
    expect(t1.itemSlug).toBe("001-feat-my-feature");
    expect(t1.dependsOn).toEqual([]);
    expect(t1.acceptanceCriteria).toHaveLength(2);
    expect(t1.acceptanceCriteria.every((ac) => ac.checked)).toBe(true);

    const t2 = output.tasks.find((t) => t.priority === "002")!;
    expect(t2.name).toBe("Add login");
    expect(t2.status).toBe("in-progress");
    expect(t2.dependsOn).toEqual(["001-setup-project"]);
    expect(t2.acceptanceCriteria).toHaveLength(3);
    expect(t2.acceptanceCriteria[0].checked).toBe(true);
    expect(t2.acceptanceCriteria[1].checked).toBe(false);
  });

  it("has no validation errors", () => {
    expect(output.validation.errors).toHaveLength(0);
  });

  it("serializes to valid JSON", () => {
    const json = JSON.parse(serializeOutput(output));
    expect(json.protocol).toBe("backlogmd/v2");
    expect(json.entries).toHaveLength(1);
    expect(json.items).toHaveLength(1);
    expect(json.tasks).toHaveLength(2);
  });
});

describe("integration: with-warnings fixture (SPEC v2)", () => {
  const output = buildBacklogOutput(path.join(FIXTURES, "with-warnings"));

  it("parses entry and tasks", () => {
    expect(output.entries).toHaveLength(1);
    expect(output.tasks).toHaveLength(2);
  });

  it("produces warning for missing task file referenced in index", () => {
    const warning = output.validation.warnings.find(
      (w) => w.code === "INDEX_TASK_MISSING_FILE",
    );
    expect(warning).toBeDefined();
    expect(warning!.message).toContain("003-missing-file.md");
  });

  it("has no validation errors", () => {
    expect(output.validation.errors).toHaveLength(0);
  });
});
