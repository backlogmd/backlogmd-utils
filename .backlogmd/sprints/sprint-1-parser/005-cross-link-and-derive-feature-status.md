# Cross-link and derive feature status

- **Status:** todo
- **Priority:** 005
- **Owner:** —
- **Depends on:** [Setup tooling](001-setup-tooling.md)
- **Feature:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)

## Description

After parsing backlog, sprints, and tasks, build cross-references: link each task to its feature (by feature id from the task's Feature link) and attach task refs to each feature. Derive feature status from task statuses per protocol: all tasks done → `done`; any task in-progress / ready-to-review / ready-to-test → `in-progress`; else `todo`. Validate that sprint table status/owner and task file content are in sync and collect warnings/errors.

## Acceptance Criteria

- [ ] Every task has a resolved `feature` reference (feature id and name).
- [ ] Every feature has a list of task refs (sprint slug + priority).
- [ ] Derived feature status is computed and exposed (e.g. `statusDerived` alongside `statusDeclared`).
- [ ] Validation runs for table-vs-file consistency and missing references; results are collectible for the JSON output.
