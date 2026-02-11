# Feature: Dev Board Server

- **Status:** open
- **Goal:** Provide a lightweight dev server that watches `.backlogmd/` and serves a live-updating kanban board with Todo, In Progress, and Done columns.

## Tasks

| #   | Task                                                            | Status | Owner | Depends on                                                              |
| --- | --------------------------------------------------------------- | ------ | ----- | ----------------------------------------------------------------------- |
| 001 | [Scaffold serve package](001-scaffold-serve-package.md)         | done   | —     | —                                                                       |
| 002 | [Implement file watcher](002-implement-file-watcher.md)         | done   | —     | [001](001-scaffold-serve-package.md)                                    |
| 003 | [Build HTML template](003-build-html-template.md)               | done   | —     | [001](001-scaffold-serve-package.md)                                    |
| 004 | [Implement HTTP server](004-implement-http-server.md)           | done   | —     | [002](002-implement-file-watcher.md), [003](003-build-html-template.md) |
| 005 | [Wire up public API and CLI](005-wire-up-public-api-and-cli.md) | done   | —     | [004](004-implement-http-server.md)                                     |
| 006 | [Write tests](006-write-tests.md)                               | done   | —     | [005](005-wire-up-public-api-and-cli.md)                                |
| 007 | [Improve design](007-improve-design.md)                         | done   | —     | [006](006-write-tests.md)                                               |
| 008 | [Rename title](008-rename-title.md)                             | done   | —     | —                                                                       |
