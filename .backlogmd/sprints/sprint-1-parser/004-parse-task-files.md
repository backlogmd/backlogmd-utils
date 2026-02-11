# Parse task files

- **Status:** todo
- **Priority:** 004
- **Owner:** —
- **Depends on:** [Setup tooling](001-setup-tooling.md)
- **Feature:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)

## Description

Implement a parser for task files `.backlogmd/sprints/<sprint-slug>/<NNN>-<task-slug>.md`. Extract task name from `# <Task Name>`, metadata from bullets (**Status**, **Priority**, **Owner**, **Feature** link), the **Description** section body as raw Markdown, and **Acceptance Criteria** as a list of `{ text, checked }` items from checkbox lines.

## Acceptance Criteria

- [ ] Task id is derived as `<sprintSlug>/<priority>`; slug from filename.
- [ ] Status is one of `todo`, `in-progress`, `ready-to-review`, `ready-to-test`, `done`.
- [ ] Feature link anchor is parsed to obtain the parent feature id (e.g. `#001---...` → `001`).
- [ ] Description section content is preserved as Markdown string.
- [ ] Acceptance criteria checkboxes are parsed; `[x]` / `[X]` → checked, `[ ]` → unchecked.
- [ ] Unit tests cover: valid task, missing sections, checked/unchecked criteria, invalid status values.
