import { describe, it, expect } from "vitest";
import { patchMetadataField, patchTableCell } from "../src/patch.js";

// ─── patchMetadataField ──────────────────────────────────────────────

describe("patchMetadataField", () => {
  const taskFile = [
    "# Setup project",
    "",
    "- **Status:** todo",
    "- **Priority:** 001",
    "- **Owner:** @alice",
    '- **Item:** [My Feature](../../backlog.md#001---my-feature)',
    "- **Depends on:** —",
    "- **Blocks:** —",
    "",
    "## Description",
    "",
    "Bootstrap the project.",
  ].join("\n");

  it("patches the Status field", () => {
    const result = patchMetadataField(taskFile, "Status", "in-progress");
    expect(result.original).toBe("- **Status:** todo");
    expect(result.replacement).toBe("- **Status:** in-progress");
    expect(result.patched).toContain("- **Status:** in-progress");
    expect(result.patched).not.toContain("- **Status:** todo");
  });

  it("patches the Owner field", () => {
    const result = patchMetadataField(taskFile, "Owner", "@bob");
    expect(result.original).toBe("- **Owner:** @alice");
    expect(result.replacement).toBe("- **Owner:** @bob");
    expect(result.patched).toContain("- **Owner:** @bob");
  });

  it("does not touch other fields", () => {
    const result = patchMetadataField(taskFile, "Status", "done");
    expect(result.patched).toContain("- **Priority:** 001");
    expect(result.patched).toContain("- **Owner:** @alice");
    expect(result.patched).toContain("- **Depends on:** —");
  });

  it("throws if field is not found", () => {
    expect(() => patchMetadataField(taskFile, "Nonexistent", "x")).toThrow(
      'Field "**Nonexistent:**" not found',
    );
  });

  it("patches Status in a backlog.md item section", () => {
    const backlog = [
      "# Roadmap",
      "",
      "## Items",
      "",
      "### 001 - My Feature",
      "- **Type:** feature",
      "- **Status:** todo",
      "- **Item:** [My Feature](items/my-feature/index.md)",
      "- **Description:** A test feature.",
    ].join("\n");

    const result = patchMetadataField(backlog, "Status", "in-progress");
    expect(result.patched).toContain("- **Status:** in-progress");
    // Type should be unchanged
    expect(result.patched).toContain("- **Type:** feature");
  });

  it("handles values with special characters", () => {
    const content = "- **Status:** ready-to-review";
    const result = patchMetadataField(content, "Status", "ready-to-test");
    expect(result.replacement).toBe("- **Status:** ready-to-test");
  });
});

// ─── patchTableCell ──────────────────────────────────────────────────

describe("patchTableCell", () => {
  const indexFile = [
    "# My Feature",
    "",
    "- **Type:** feature",
    "- **Status:** open",
    "- **Goal:** Validate the pipeline.",
    "",
    "## Tasks",
    "",
    "| # | Task | Status | Owner | Depends on |",
    "|---|------|--------|-------|------------|",
    "| 001 | [Setup project](001-setup-project.md) | done | @alice | — |",
    "| 002 | [Add login](002-add-login.md) | in-progress | @bob | [001](001-setup-project.md) |",
  ].join("\n");

  it("patches the Status cell of a specific row", () => {
    const result = patchTableCell(indexFile, "001", 2, "in-progress");
    expect(result.patched).toContain("| 001 |");
    // The patched line should have the new status
    const patchedLines = result.patched.split("\n");
    const row001 = patchedLines.find((l) => l.includes("| 001 |"));
    expect(row001).toContain("in-progress");
    expect(row001).not.toMatch(/\| done \|/);
  });

  it("patches the Status cell of a different row", () => {
    const result = patchTableCell(indexFile, "002", 2, "done");
    const patchedLines = result.patched.split("\n");
    const row002 = patchedLines.find((l) => l.includes("| 002 |"));
    expect(row002).toContain("done");
  });

  it("does not touch other rows", () => {
    const result = patchTableCell(indexFile, "001", 2, "in-progress");
    const patchedLines = result.patched.split("\n");
    const row002 = patchedLines.find((l) => l.includes("| 002 |"));
    // Row 002 should still have its original status
    expect(row002).toContain("in-progress");
    expect(row002).toContain("@bob");
  });

  it("does not touch the header or separator rows", () => {
    const result = patchTableCell(indexFile, "001", 2, "in-progress");
    expect(result.patched).toContain(
      "| # | Task | Status | Owner | Depends on |",
    );
    expect(result.patched).toContain("|---|------|--------|-------|------------|");
  });

  it("throws if row is not found", () => {
    expect(() => patchTableCell(indexFile, "999", 2, "done")).toThrow(
      'Table row with id "999" not found',
    );
  });

  it("throws if column index is out of range", () => {
    expect(() => patchTableCell(indexFile, "001", 99, "done")).toThrow(
      "Column index 99 out of range",
    );
  });

  it("preserves non-table content around the table", () => {
    const result = patchTableCell(indexFile, "001", 2, "in-progress");
    expect(result.patched).toContain("# My Feature");
    expect(result.patched).toContain("- **Type:** feature");
    expect(result.patched).toContain("- **Goal:** Validate the pipeline.");
  });
});
