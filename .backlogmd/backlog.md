# Roadmap

## Items

### 001 - BacklogMD parser emits JSON

- **Type:** feature
- **Status:** done
- **Item:** [BacklogMD parser emits JSON](items/backlogmd-parser-emits-json/index.md)
- **Description:** Convert Backlog.md markdown (backlog, features, tasks) into a single canonical JSON file with cross-links and validation.

### 002 - Fix backlogmd-serve parser table column validation

- **Type:** bugfix
- **Status:** todo
- **Item:** [Fix backlogmd-serve parser table column validation](items/fix-backlogmd-serve-parser-table-column-validation/index.md)
- **Description:** Parser crashes when task tables have 4 columns instead of expected 5

### 003 - Dev Board Server

- **Type:** feature
- **Status:** done
- **Item:** [Dev Board Server](items/dev-board-server/index.md)
- **Description:** Lightweight dev server that watches `.backlogmd/` and serves a live-updating kanban board with Todo, In Progress, and Done columns.

### 004 - Publish packages to npm

- **Type:** feature
- **Status:** done
- **Item:** [Publish packages to npm](items/publish-packages-to-npm/index.md)
- **Description:** Prepare @backlogmd/parser and @backlogmd/serve for npm publishing with trimmed API surface, package metadata, and automated CI publishing via GitHub Actions.

### 005 - Improve error handling for malformed task tables

- **Type:** refactor
- **Status:** todo
- **Item:** [Improve error handling for malformed task tables](items/improve-error-handling-malformed-tables/index.md)
- **Description:** Prevent parser crashes and provide clear error messages for malformed task tables with empty fields, invalid links, mixed column formats, and markdown syntax errors.
