import { describe, it, expect } from "vitest";
import { buildBacklogOutput } from "../packages/parser/src/index.js";
import { readFileSync } from "fs";
import { join } from "path";

describe("4-column table integration tests", () => {
  it("parses item with 4-column task table without crashing", () => {
    // Test with the exact fixture that was failing
    const fixtureDir = "tests/fixtures/4-column-table";
    const indexContent = readFileSync(join(fixtureDir, "index.md"), "utf8");

    // This should not throw an error
    const result = JSON.parse(JSON.stringify(buildBacklogOutput(fixtureDir)));

    // Verify the structure
    expect(result).toHaveProperty("itemFolders");
    expect(result.itemFolders).toHaveLength(1);

    const itemFolder = result.itemFolders[0];
    expect(itemFolder.name).toBe("Fix backlogmd-serve parser table column validation");
    expect(itemFolder.type).toBe("bugfix");
    expect(itemFolder.status).toBe("open");
    expect(itemFolder.tasks).toHaveLength(4);

    // Verify each task was parsed correctly
    const tasks = itemFolder.tasks;
    expect(tasks[0]).toEqual({
      priority: "001",
      name: "Investigate parser code to understand column validation logic",
      fileName: "001-investigate-parser-code.md",
      status: "todo",
      owner: null,
      dependsOn: [],
    });

    expect(tasks[1]).toEqual({
      priority: "002",
      name: "Fix parser to handle variable column counts in task tables",
      fileName: "002-fix-parser-variable-columns.md",
      status: "todo",
      owner: null,
      dependsOn: [],
    });

    expect(tasks[2]).toEqual({
      priority: "003",
      name: "Add tests to prevent regression",
      fileName: "003-add-tests-prevent-regression.md",
      status: "todo",
      owner: null,
      dependsOn: [],
    });

    expect(tasks[3]).toEqual({
      priority: "004",
      name: "Update documentation to clarify task table format",
      fileName: "004-update-documentation-table-format.md",
      status: "todo",
      owner: null,
      dependsOn: [],
    });
  });
});
