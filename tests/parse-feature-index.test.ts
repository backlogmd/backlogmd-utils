import { describe, it, expect } from "vitest";
import { parseFeatureIndex } from "@backlogmd/parser";

const VALID_FEATURE = `# Feature: User Authentication

- **Status:** open
- **Goal:** Allow users to sign in securely

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Set up auth provider](001-setup-auth.md) | todo | @alice | — |
| 002 | [Login page](002-login-page.md) | in-progress | @bob | 001 |
| 003 | [Session management](003-session-mgmt.md) | done | — | 001, 002 |
`;

describe("parseFeatureIndex", () => {
  it("parses a valid feature index", () => {
    const result = parseFeatureIndex(VALID_FEATURE, "user-auth", "features/user-auth/index.md");

    expect(result.slug).toBe("user-auth");
    expect(result.name).toBe("User Authentication");
    expect(result.status).toBe("open");
    expect(result.goal).toBe("Allow users to sign in securely");
    expect(result.source).toBe("features/user-auth/index.md");
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

  it("parses archived feature status", () => {
    const md = `# Feature: Old Feature

- **Status:** archived
- **Goal:** Legacy feature

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Only task](001-only.md) | done | @dev | — |
`;

    const result = parseFeatureIndex(md, "old-feature", "features/old-feature/index.md");
    expect(result.status).toBe("archived");
  });

  it("throws on missing goal", () => {
    const md = `# Feature: No Goal

- **Status:** open

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | todo | — | — |
`;

    expect(() => parseFeatureIndex(md, "no-goal", "features/no-goal/index.md")).toThrow(
      /Missing "Goal" metadata/,
    );
  });

  it("throws on missing status", () => {
    const md = `# Feature: No Status

- **Goal:** something

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | todo | — | — |
`;

    expect(() => parseFeatureIndex(md, "no-status", "features/no-status/index.md")).toThrow(
      /Missing "Status" metadata/,
    );
  });

  it("throws on invalid feature status", () => {
    const md = `# Feature: Bad Status

- **Status:** completed
- **Goal:** something

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | todo | — | — |
`;

    expect(() => parseFeatureIndex(md, "bad", "features/bad/index.md")).toThrow(
      /Invalid feature status "completed"/,
    );
  });

  it("throws on invalid task status", () => {
    const md = `# Feature: Bad Task Status

- **Status:** open
- **Goal:** something

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | blocked | @alice | — |
`;

    expect(() => parseFeatureIndex(md, "bad-task", "features/bad-task/index.md")).toThrow(
      /Invalid task status "blocked"/,
    );
  });

  it("throws on missing Feature heading", () => {
    const md = `# Something Else

- **Status:** open
- **Goal:** something

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
`;

    expect(() => parseFeatureIndex(md, "bad", "features/bad/index.md")).toThrow(
      /Heading must start with "Feature: "/,
    );
  });

  it("throws on missing h1 heading entirely", () => {
    const md = `## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
`;

    expect(() => parseFeatureIndex(md, "bad", "features/bad/index.md")).toThrow(
      /Missing "# Feature: ..." heading/,
    );
  });

  it("throws on missing ## Tasks section", () => {
    const md = `# Feature: No Tasks

- **Status:** open
- **Goal:** something
`;

    expect(() => parseFeatureIndex(md, "no-tasks", "features/no-tasks/index.md")).toThrow(
      /Missing "## Tasks" section/,
    );
  });

  it("throws on missing table under ## Tasks", () => {
    const md = `# Feature: No Table

- **Status:** open
- **Goal:** something

## Tasks

No table here.
`;

    expect(() => parseFeatureIndex(md, "no-table", "features/no-table/index.md")).toThrow(
      /Missing tasks table under "## Tasks"/,
    );
  });

  it("handles unassigned owner (em dash) as null", () => {
    const md = `# Feature: Test

- **Status:** open
- **Goal:** testing owners

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task one](001-task.md) | todo | — | — |
`;

    const result = parseFeatureIndex(md, "test", "features/test/index.md");
    expect(result.tasks[0].owner).toBeNull();
  });

  it("parses dependency references correctly", () => {
    const md = `# Feature: Deps

- **Status:** open
- **Goal:** test dependencies

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [First](001-first.md) | todo | @a | — |
| 002 | [Second](002-second.md) | todo | @b | 001 |
| 003 | [Third](003-third.md) | todo | @c | 001, 002 |
`;

    const result = parseFeatureIndex(md, "deps", "features/deps/index.md");
    expect(result.tasks[0].dependsOn).toEqual([]);
    expect(result.tasks[1].dependsOn).toEqual(["001"]);
    expect(result.tasks[2].dependsOn).toEqual(["001", "002"]);
  });

  it("throws when task row is missing the link", () => {
    const md = `# Feature: No Link

- **Status:** open
- **Goal:** test

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | Just plain text | todo | @a | — |
`;

    expect(() => parseFeatureIndex(md, "no-link", "features/no-link/index.md")).toThrow(
      /missing link in task column/,
    );
  });

  it("handles all valid task statuses", () => {
    const statuses = ["todo", "in-progress", "ready-to-review", "ready-to-test", "done"];

    for (const status of statuses) {
      const md = `# Feature: Status Test

- **Status:** open
- **Goal:** testing

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
| 001 | [Task](001-task.md) | ${status} | — | — |
`;

      const result = parseFeatureIndex(md, "s", "s.md");
      expect(result.tasks[0].status).toBe(status);
    }
  });

  it("handles empty tasks table (header only)", () => {
    const md = `# Feature: Empty

- **Status:** open
- **Goal:** nothing yet

## Tasks

| # | Task | Status | Owner | Depends on |
|---|------|--------|-------|------------|
`;

    const result = parseFeatureIndex(md, "empty", "features/empty/index.md");
    expect(result.tasks).toEqual([]);
  });
});
