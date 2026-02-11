# Parse task files

- **Status:** done
- **Priority:** 004
- **Owner:** —
- **Item:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)
- **Depends on:** [001 - Setup tooling](001-setup-tooling.md)
- **Blocks:** [005 - Cross-link and derive feature status](005-cross-link-and-derive-feature-status.md)

## Description

Implement a parser for task files `.backlogmd/features/<feature-slug>/<NNN>-<task-slug>.md`. Extract task name from `# <Task Name>`, metadata from bullets (**Status**, **Priority**, **Owner**, **Feature** link, **Depends on**, **Blocks**), the **Description** section body as raw Markdown, and **Acceptance Criteria** as a list of `{ text, checked }` items from checkbox lines.

## Acceptance Criteria

- [ ] Task id is derived as `<featureSlug>/<priority>`; slug from filename.
- [ ] Status is one of `todo`, `in-progress`, `ready-to-review`, `ready-to-test`, `done`.
- [ ] Feature link anchor is parsed to obtain the parent feature id (e.g. `#001---...` → `001`).
- [ ] `Depends on` and `Blocks` fields are parsed as lists of task links or `—`.
- [ ] Description section content is preserved as Markdown string.
- [ ] Acceptance criteria checkboxes are parsed; `[x]` / `[X]` → checked, `[ ]` → unchecked.
- [ ] Unit tests cover: valid task, missing sections, checked/unchecked criteria, invalid status values, dependency parsing.
