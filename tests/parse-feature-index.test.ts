import { describe, it, expect } from "vitest";
import { parseItemIndex } from "../packages/parser/src/parse-item-index.js";

const VALID_ITEM = `# User Authentication

- **Type:** feature
- **Status:** open
- **Goal:** Allow users to sign in securely

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Set up auth provider](001-setup-auth.md) | todo | @alice | — |
| 002 | [Login page](002-login-page.md) | in-progress | @bob | 001 |
| 003 | [Session management](003-session-mgmt.md) | done | — | 001, 002 |
`;

describe("parseItemIndex", () => {
  it("parses a valid item index", () => {
    const result = parseItemIndex(VALID_ITEM, "user-auth", "items/user-auth/index.md");

    expect(result.slug).toBe("user-auth");
    expect(result.name).toBe("User Authentication");
    expect(result.type).toBe("feature");
    expect(result.status).toBe("open");
    expect(result.goal).toBe("Allow users to sign in securely");
    expect(result.source).toBe("items/user-auth/index.md");
    expect(result.tasks).toHaveLength(3);

    expect(result.tasks[0]).toEqual({
      priority: "001",
      name: "Set up auth provider",
      fileName: "001-setup-auth.md",
      status: "todo",
      owner: "@alice",
      dependsOn: [],
    });

    expect(result.tasks[1]).toEqual({
      priority: "002",
      name: "Login page",
      fileName: "002-login-page.md",
      status: "in-progress",
      owner: "@bob",
      dependsOn: ["001"],
    });

    expect(result.tasks[2]).toEqual({
      priority: "003",
      name: "Session management",
      fileName: "003-session-mgmt.md",
      status: "done",
      owner: null,
      dependsOn: ["001", "002"],
    });
  });

  it("parses archived item status", () => {
    const md = `# Old Feature

- **Type:** feature
- **Status:** archived
- **Goal:** Legacy feature

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Only task](001-only.md) | done | @dev | — |
`;

    const result = parseItemIndex(md, "old-feature", "items/old-feature/index.md");
    expect(result.status).toBe("archived");
  });

  it("parses all valid item types", () => {
    const types = ["feature", "bugfix", "refactor", "chore"];

    for (const type of types) {
      const md = `# Type Test

- **Type:** ${type}
- **Status:** open
- **Goal:** testing types

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | todo | — | — |
`;

      const result = parseItemIndex(md, "t", "t.md");
      expect(result.type).toBe(type);
    }
  });

  it("throws on missing type", () => {
    const md = `# No Type

- **Status:** open
- **Goal:** something

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | todo | — | — |
`;

    expect(() => parseItemIndex(md, "no-type", "items/no-type/index.md")).toThrow(
      /Missing "Type" metadata/,
    );
  });

  it("throws on invalid item type", () => {
    const md = `# Bad Type

- **Type:** epic
- **Status:** open
- **Goal:** something

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | todo | — | — |
`;

    expect(() => parseItemIndex(md, "bad", "items/bad/index.md")).toThrow(
      /Invalid item type "epic"/,
    );
  });

  it("throws on missing goal", () => {
    const md = `# No Goal

- **Type:** feature
- **Status:** open

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | todo | — | — |
`;

    expect(() => parseItemIndex(md, "no-goal", "items/no-goal/index.md")).toThrow(
      /Missing "Goal" metadata/,
    );
  });

  it("throws on missing status", () => {
    const md = `# No Status

- **Type:** feature
- **Goal:** something

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | todo | — | — |
`;

    expect(() => parseItemIndex(md, "no-status", "items/no-status/index.md")).toThrow(
      /Missing "Status" metadata/,
    );
  });

  it("throws on invalid item status", () => {
    const md = `# Bad Status

- **Type:** feature
- **Status:** completed
- **Goal:** something

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | todo | — | — |
`;

    expect(() => parseItemIndex(md, "bad", "items/bad/index.md")).toThrow(
      /Invalid item status "completed"/,
    );
  });

  it("throws on invalid task status", () => {
    const md = `# Bad Task Status

- **Type:** feature
- **Status:** open
- **Goal:** something

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | blocked | @alice | — |
`;

    expect(() => parseItemIndex(md, "bad-task", "items/bad-task/index.md")).toThrow(
      /Invalid task status "blocked"/,
    );
  });

  it("throws on missing h1 heading entirely", () => {
    const md = `## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
`;

    expect(() => parseItemIndex(md, "bad", "items/bad/index.md")).toThrow(/Missing h1 heading/);
  });

  it("throws on missing ## Tasks section", () => {
    const md = `# No Tasks

- **Type:** feature
- **Status:** open
- **Goal:** something
`;

    expect(() => parseItemIndex(md, "no-tasks", "items/no-tasks/index.md")).toThrow(
      /Missing "## Tasks" section/,
    );
  });

  it("throws on missing table under ## Tasks", () => {
    const md = `# No Table

- **Type:** feature
- **Status:** open
- **Goal:** something

## Tasks

No table here.
`;

    expect(() => parseItemIndex(md, "no-table", "items/no-table/index.md")).toThrow(
      /Missing tasks table under "## Tasks"/,
    );
  });

  it("handles unassigned owner (em dash) as null", () => {
    const md = `# Test

- **Type:** feature
- **Status:** open
- **Goal:** testing owners

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task one](001-task.md) | todo | — | — |
`;

    const result = parseItemIndex(md, "test", "items/test/index.md");
    expect(result.tasks[0].owner).toBeNull();
  });

  it("parses dependency references correctly", () => {
    const md = `# Deps

- **Type:** feature
- **Status:** open
- **Goal:** test dependencies

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [First](001-first.md) | todo | @a | — |
| 002 | [Second](002-second.md) | todo | @b | 001 |
| 003 | [Third](003-third.md) | todo | @c | 001, 002 |
`;

    const result = parseItemIndex(md, "deps", "items/deps/index.md");
    expect(result.tasks[0].dependsOn).toEqual([]);
    expect(result.tasks[1].dependsOn).toEqual(["001"]);
    expect(result.tasks[2].dependsOn).toEqual(["001", "002"]);
  });

  it("throws when task row is missing the link", () => {
    const md = `# No Link

- **Type:** feature
- **Status:** open
- **Goal:** test

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | Just plain text | todo | @a | — |
`;

    expect(() => parseItemIndex(md, "no-link", "items/no-link/index.md")).toThrow(
      /missing link in task column/,
    );
  });

  it("handles all valid task statuses", () => {
    const statuses = ["todo", "in-progress", "ready-to-review", "ready-to-test", "done"];

    for (const status of statuses) {
      const md = `# Status Test

- **Type:** feature
- **Status:** open
- **Goal:** testing

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | ${status} | — | — |
`;

      const result = parseItemIndex(md, "s", "s.md");
      expect(result.tasks[0].status).toBe(status);
    }
  });

  it("handles empty tasks table (header only)", () => {
    const md = `# Empty

- **Type:** feature
- **Status:** open
- **Goal:** nothing yet

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
`;

    const result = parseItemIndex(md, "empty", "items/empty/index.md");
    expect(result.tasks).toEqual([]);
  });

  describe("4-column task tables", () => {
    it("parses 4-column table without dependencies", () => {
      const md = `# Simple Feature

- **Type:** feature
- **Status:** open
- **Goal:** Test 4-column tables

## Tasks

| # | Task | Status | Owner |
|---|------|--------|-------|
| 001 | [Simple task](001-simple.md) | todo | @alice |
| 002 | [Another task](002-another.md) | done | — |
`;

      const result = parseItemIndex(md, "simple", "items/simple/index.md");
      expect(result.tasks).toHaveLength(2);

      expect(result.tasks[0]).toEqual({
        priority: "001",
        name: "Simple task",
        fileName: "001-simple.md",
        status: "todo",
        owner: "@alice",
        dependsOn: [],
      });

      expect(result.tasks[1]).toEqual({
        priority: "002",
        name: "Another task",
        fileName: "002-another.md",
        status: "done",
        owner: null,
        dependsOn: [],
      });
    });

    it("handles all valid task statuses in 4-column format", () => {
      const statuses = ["todo", "in-progress", "ready-to-review", "ready-to-test", "done"];

      for (const status of statuses) {
        const md = `# Status Test

- **Type:** feature
- **Status:** open
- **Goal:** testing

## Tasks

| # | Task | Status | Owner |
|---|------|--------|-------|
| 001 | [Task](001-task.md) | ${status} | — |
`;

        const result = parseItemIndex(md, "s", "s.md");
        expect(result.tasks[0].status).toBe(status);
        expect(result.tasks[0].dependsOn).toEqual([]);
      }
    });

    it("handles unassigned owner in 4-column format", () => {
      const md = `# Test

- **Type:** feature
- **Status:** open
- **Goal:** testing owners

## Tasks

| # | Task | Status | Owner |
|---|------|--------|-------|
| 001 | [Task one](001-task.md) | todo | — |
`;

      const result = parseItemIndex(md, "test", "items/test/index.md");
      expect(result.tasks[0].owner).toBeNull();
      expect(result.tasks[0].dependsOn).toEqual([]);
    });

    it("handles empty 4-column table (header only)", () => {
      const md = `# Empty

- **Type:** feature
- **Status:** open
- **Goal:** nothing yet

## Tasks

| # | Task | Status | Owner |
|---|------|--------|-------|
`;

      const result = parseItemIndex(md, "empty", "items/empty/index.md");
      expect(result.tasks).toEqual([]);
    });

    it("throws error on 3-column table (too few columns)", () => {
      const md = `# Bad Table

- **Type:** feature
- **Status:** open
- **Goal:** bad format

## Tasks

| # | Task | Status |
|---|------|--------|
| 001 | [Task](001-task.md) | todo |
`;

      expect(() => parseItemIndex(md, "bad", "items/bad/index.md")).toThrow(
        /Task table row has 3 columns, expected 4 or 5/,
      );
    });

    it("throws error on 6-column table (too many columns)", () => {
      const md = `# Bad Table

- **Type:** feature
- **Status:** open
- **Goal:** bad format

## Tasks

| # | Task | Status | Owner | Depends on | Extra |
|---|------|--------|-------|------------|-------|
| 001 | [Task](001-task.md) | todo | @alice | — | extra |
`;

      expect(() => parseItemIndex(md, "bad", "items/bad/index.md")).toThrow(
        /Task table row has 6 columns, expected 4 or 5/,
      );
    });
  });
});
