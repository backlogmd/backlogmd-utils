# Parse backlog.md

- **Status:** todo
- **Priority:** 002
- **Owner:** —
- **Depends on:** [Setup tooling](001-setup-tooling.md)
- **Feature:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)

## Description

Implement a parser for `.backlogmd/backlog.md` that extracts each feature block. Each block starts with `### NNN - <Feature Name>` and contains three bullet fields: **Status**, **Sprint** (link or em dash), **Description**. Output a list of feature objects with `id`, `name`, `status`, `sprint` (slug or null), `description`, and source location.

## Acceptance Criteria

- [ ] Parser correctly identifies all `### NNN - ...` feature blocks under `## Features`.
- [ ] Status is normalized to one of `todo`, `in-progress`, `done`.
- [ ] Sprint link is parsed to extract `sprint-slug` from path; em dash yields no sprint.
- [ ] Description is captured as a single line of text.
- [ ] Invalid or missing required fields produce clear parse errors.
- [ ] Unit tests cover: multiple features, missing fields, malformed headers.
