# BacklogMD format (skill for the autopilot agent)

You are helping users work with **BacklogMD**: a markdown-based backlog that lives under a root directory (often `.backlogmd/` or repo root). The structure is defined by the BacklogMD spec (e.g. [backlogmd/backlogmd](https://github.com/backlogmd/backlogmd)).

## Layout

- **Root**: Contains a `work/` directory. Optionally a single `backlog.md` at root (legacy).
- **Work items**: Each item is a folder `work/<slug>/` where `slug` is like `001-feat-my-feature` or `002-chore-setup`.
- **Item index**: `work/<slug>/index.md` — defines the work item (title, status, description, context).
- **Tasks**: Task files live inside the item folder: `work/<slug>/NNN-task-name.md` (e.g. `001-setup-project.md`, `002-add-login.md`). Tasks are discovered by listing the directory (SPEC v4).

## Item (work item)

- **Slug**: Directory name, e.g. `001-feat-my-feature`. Often includes zero-padded id + type + short name.
- **Type** (from slug): `feat` | `fix` | `refactor` | `chore` (Conventional Commits style).
- **Status** (from index.md): `plan` | `open` | `claimed` | `in-progress` | `done`.
- **Assignee**: When status is `claimed`, an assignee/agent id is set; empty when open or done.

Item `index.md` (SPEC v4) uses HTML comment blocks:

- `<!-- METADATA -->` with a YAML block: `work: <title>`, `status: open|claimed|in-progress|done`, optional `assignee`.
- `<!-- DESCRIPTION -->` — main description.
- `<!-- CONTEXT -->` — bullets or notes for extra context.

## Task

- **File name**: `<tid>-<task-slug>.md` (e.g. `001-setup-project.md`).
- **Status**: `plan` | `open` | `in-progress` | `review` | `block` | `done`.
- **Priority**: Number (lower = higher priority).
- **Dependencies**: `dep` (SPEC v4) — paths relative to `.backlogmd/` or task slugs.
- **Sections**: METADATA (YAML), DESCRIPTION, ACCEPTANCE (checkboxes `- [ ]` / `- [x]`).

Task metadata (SPEC v4) in `<!-- METADATA -->` YAML:

- `task: <name>`, `status`, `priority`, `dep: []`, `assignee`, `requiresHumanReview`, `expiresAt`.

Optional **task feedback**: a file `NNN-task-name-feedback.md` in the same folder is attached to the task as feedback.

## API / tooling

- The **backlogmd-serve** app exposes the backlog as JSON: `GET /api/backlog` or `GET /api/backlog.json`. Use the same base URL as the chat endpoint.
- When the user has the serve running, suggest calling that API to inspect the current backlog (items, tasks, statuses, validation errors/warnings).

## Summary

- Work items live under `work/<slug>/` with `index.md` and task files `NNN-name.md`.
- Item status: plan → open → claimed → in-progress → done.
- Task status: plan → open → in-progress → review/done; can be `block` from active states.
- Use the serve `/api/backlog` (or `/api/backlog.json`) to get the current state when available.
