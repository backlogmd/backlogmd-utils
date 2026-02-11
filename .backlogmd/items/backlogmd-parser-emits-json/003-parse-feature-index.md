# Parse sprint index

- **Status:** done
- **Priority:** 003
- **Owner:** —
- **Depends on:** [Setup tooling](001-setup-tooling.md)
- **Item:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)

## Description

Implement a parser for `.backlogmd/sprints/<sprint-slug>/index.md`. Extract sprint metadata from the heading `# Sprint: <name>` and bullets **Status**, **Goal**. Parse the `## Tasks` Markdown table: columns # (priority), Task (link), Status, Owner. Each row yields a task stub with priority, task file path, status, and owner (or null for em dash).

## Acceptance Criteria

- [ ] Sprint slug is taken from the folder name; name and goal from content.
- [ ] Sprint status is one of `open`, `archived`.
- [ ] Task table rows are parsed; link target gives the task filename for that sprint.
- [ ] Owner is normalized to a handle string or null when unassigned (`—`).
- [ ] Malformed table or missing sections produce clear errors.
- [ ] Unit tests cover: valid sprint, missing goal, malformed table rows, unassigned owners.
