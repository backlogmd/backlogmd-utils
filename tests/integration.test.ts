import { describe, it, expect } from "vitest";
import path from "node:path";
import { buildBacklogOutput, serializeOutput } from "@backlogmd/parser";

const FIXTURES = path.resolve(__dirname, "fixtures");

describe("integration: happy-path fixture", () => {
  const output = buildBacklogOutput(path.join(FIXTURES, "happy-path"));

  it("has correct protocol version", () => {
    expect(output.protocol).toBe("backlogmd/v1");
  });

  it("parses one feature with correct fields", () => {
    expect(output.features).toHaveLength(1);

    const f = output.features[0];
    expect(f.id).toBe("001");
    expect(f.name).toBe("My Feature");
    expect(f.status).toBe("in-progress");
    expect(f.featureSlug).toBe("my-feature");
    expect(f.description).toBe("A test feature for integration testing.");
    expect(f.taskRefs).toEqual(["my-feature/001", "my-feature/002"]);
  });

  it("derives feature status as in-progress", () => {
    expect(output.features[0].statusDerived).toBe("in-progress");
  });

  it("parses one feature folder", () => {
    expect(output.featureFolders).toHaveLength(1);

    const ff = output.featureFolders[0];
    expect(ff.slug).toBe("my-feature");
    expect(ff.name).toBe("My Feature");
    expect(ff.status).toBe("open");
    expect(ff.goal).toBe("Validate the full parser pipeline end-to-end.");
    expect(ff.tasks).toHaveLength(2);
  });

  it("parses two tasks with correct data", () => {
    expect(output.tasks).toHaveLength(2);

    const t1 = output.tasks.find((t) => t.priority === "001")!;
    expect(t1.name).toBe("Setup project");
    expect(t1.status).toBe("done");
    expect(t1.owner).toBe("@alice");
    expect(t1.featureId).toBe("001");
    expect(t1.dependsOn).toEqual([]);
    expect(t1.acceptanceCriteria).toHaveLength(2);
    expect(t1.acceptanceCriteria.every((ac) => ac.checked)).toBe(true);

    const t2 = output.tasks.find((t) => t.priority === "002")!;
    expect(t2.name).toBe("Add login");
    expect(t2.status).toBe("in-progress");
    expect(t2.owner).toBe("@bob");
    expect(t2.acceptanceCriteria).toHaveLength(3);
    expect(t2.acceptanceCriteria[0].checked).toBe(true);
    expect(t2.acceptanceCriteria[1].checked).toBe(false);
  });

  it("has no validation errors or warnings", () => {
    expect(output.validation.errors).toHaveLength(0);
    expect(output.validation.warnings).toHaveLength(0);
  });

  it("serializes to valid JSON with canonical shape", () => {
    const json = JSON.parse(serializeOutput(output));

    expect(json.features[0].statusDeclared).toBe("in-progress");
    expect(json.features[0].statusDerived).toBe("in-progress");
    expect(json.features[0].slug).toBe("my-feature");
    expect(json.features[0].tasks).toEqual(["my-feature/001", "my-feature/002"]);
    expect(json.featureFolders[0].tasks).toEqual(["001", "002"]);
    expect(json.tasks[0].dependsOn).toBeDefined();
    expect(json.tasks[0].blocks).toBeDefined();
  });
});

describe("integration: with-warnings fixture", () => {
  const output = buildBacklogOutput(path.join(FIXTURES, "with-warnings"));

  it("parses feature and tasks", () => {
    expect(output.features).toHaveLength(1);
    expect(output.tasks).toHaveLength(2);
  });

  it("produces status mismatch warning", () => {
    const statusWarning = output.validation.warnings.find((w) => w.code === "STATUS_MISMATCH");
    expect(statusWarning).toBeDefined();
    expect(statusWarning!.message).toContain("todo");
    expect(statusWarning!.message).toContain("in-progress");
  });

  it("produces owner mismatch warning", () => {
    const ownerWarning = output.validation.warnings.find((w) => w.code === "OWNER_MISMATCH");
    expect(ownerWarning).toBeDefined();
    expect(ownerWarning!.message).toContain("@alice");
    expect(ownerWarning!.message).toContain("@bob");
  });

  it("produces feature status mismatch warning (declared todo, derived in-progress)", () => {
    const featureWarning = output.validation.warnings.find(
      (w) => w.code === "FEATURE_STATUS_MISMATCH",
    );
    expect(featureWarning).toBeDefined();
    expect(featureWarning!.message).toContain("todo");
    expect(featureWarning!.message).toContain("in-progress");
  });

  it("has no validation errors", () => {
    expect(output.validation.errors).toHaveLength(0);
  });
});
