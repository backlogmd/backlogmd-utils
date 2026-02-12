import { describe, it, expect } from "vitest";
import { patchMetadataField } from "../src/patch.js";

// ─── patchMetadataField (SPEC v2) ────────────────────────────────────

describe("patchMetadataField", () => {
  const taskFile = [
    "<!-- METADATA -->",
    "",
    "```",
    "Task: Setup project",
    "Status: open",
    "Priority: 001",
    "DependsOn: —",
    "```",
    "",
    "<!-- /METADATA -->",
    "<!-- DESCRIPTION -->",
    "",
    "## Description",
    "",
    "Bootstrap the project.",
    "",
    "<!-- /DESCRIPTION -->",
  ].join("\n");

  it("patches the Status field", () => {
    const result = patchMetadataField(taskFile, "Status", "in-progress");
    expect(result.original).toBe("Status: open");
    expect(result.replacement).toBe("Status: in-progress");
    expect(result.patched).toContain("Status: in-progress");
    expect(result.patched).not.toContain("Status: open");
  });

  it("patches the Priority field", () => {
    const result = patchMetadataField(taskFile, "Priority", "002");
    expect(result.original).toBe("Priority: 001");
    expect(result.replacement).toBe("Priority: 002");
    expect(result.patched).toContain("Priority: 002");
  });

  it("does not touch other fields", () => {
    const result = patchMetadataField(taskFile, "Status", "done");
    expect(result.patched).toContain("Task: Setup project");
    expect(result.patched).toContain("Priority: 001");
    expect(result.patched).toContain("DependsOn: —");
  });

  it("does not touch content outside METADATA section", () => {
    const result = patchMetadataField(taskFile, "Status", "done");
    expect(result.patched).toContain("<!-- DESCRIPTION -->");
    expect(result.patched).toContain("## Description");
    expect(result.patched).toContain("Bootstrap the project.");
  });

  it("throws if METADATA section is not found", () => {
    const content = "# Just a regular markdown file\n\nNo metadata here.";
    expect(() => patchMetadataField(content, "Status", "done")).toThrow(
      "METADATA section not found",
    );
  });

  it("throws if field is not found in METADATA", () => {
    expect(() => patchMetadataField(taskFile, "Nonexistent", "x")).toThrow(
      'Field "Nonexistent" not found in METADATA section',
    );
  });

  it("handles values with special characters", () => {
    const content = [
      "<!-- METADATA -->",
      "",
      "```",
      "Task: Test task",
      "Status: in-progress",
      "Priority: 001",
      "```",
      "",
      "<!-- /METADATA -->",
    ].join("\n");
    const result = patchMetadataField(content, "Status", "done");
    expect(result.replacement).toBe("Status: done");
  });

  it("patches DependsOn field with a link", () => {
    const result = patchMetadataField(taskFile, "DependsOn", "[001-setup](001-setup.md)");
    expect(result.patched).toContain("DependsOn: [001-setup](001-setup.md)");
    expect(result.patched).not.toContain("DependsOn: —");
  });
});
