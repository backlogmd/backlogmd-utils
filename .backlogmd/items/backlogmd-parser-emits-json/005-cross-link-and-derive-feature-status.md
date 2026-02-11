# Cross-link and derive feature status

- **Status:** done
- **Priority:** 005
- **Owner:** —
- **Item:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)
- **Depends on:** [002 - Parse backlog.md](002-parse-backlog-md.md), [003 - Parse feature index](003-parse-feature-index.md), [004 - Parse task files](004-parse-task-files.md)
- **Blocks:** [006 - Emit canonical JSON](006-emit-canonical-json.md)

## Description

After parsing backlog, features, and tasks, build cross-references: link each task to its feature (by feature id from the task's Feature link) and attach task refs to each feature. Derive feature status from task statuses per protocol: all tasks done → `done`; any task in-progress / ready-to-review / ready-to-test → `in-progress`; else `todo`. Validate that feature index task table status/owner and task file content are in sync and collect warnings/errors. Validate task dependencies for circular references.

## Acceptance Criteria

- [ ] Every task has a resolved `feature` reference (feature id and name).
- [ ] Every feature has a list of task refs (feature slug + priority).
- [ ] Derived feature status is computed and exposed (e.g. `statusDerived` alongside `statusDeclared`).
- [ ] Task dependency graph is validated (no circular dependencies).
- [ ] Validation runs for table-vs-file consistency and missing references; results are collectible for the JSON output.
