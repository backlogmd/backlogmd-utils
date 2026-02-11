# Parse backlog.md

- **Status:** done
- **Priority:** 002
- **Owner:** —
- **Feature:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)
- **Depends on:** [001 - Setup tooling](001-setup-tooling.md)
- **Blocks:** [005 - Cross-link and derive feature status](005-cross-link-and-derive-feature-status.md)

## Description

Implement a parser for `.backlogmd/backlog.md` that extracts each feature block. Each block starts with `### NNN - <Feature Name>` and contains three bullet fields: **Status**, **Feature** (link or em dash), **Description**. Output a list of feature objects with `id`, `name`, `status`, `featureSlug` (or null), `description`, and source location.

## Acceptance Criteria

- [ ] Parser correctly identifies all `### NNN - ...` feature blocks under `## Features`.
- [ ] Status is normalized to one of `todo`, `in-progress`, `done`.
- [ ] Feature link is parsed to extract `feature-slug` from path; em dash yields no feature folder.
- [ ] Description is captured as a single line of text.
- [ ] Invalid or missing required fields produce clear parse errors.
- [ ] Unit tests cover: multiple features, missing fields, malformed headers.
