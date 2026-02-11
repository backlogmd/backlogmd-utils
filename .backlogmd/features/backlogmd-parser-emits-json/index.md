# Feature: BacklogMD parser emits JSON

- **Status:** open
- **Goal:** Have a working BacklogMD parser that reads markdown and emits a canonical JSON file with features, tasks, and validation.

## Tasks

| #   | Task                                                                                  | Status | Owner | Depends on                                                                                        |
| --- | ------------------------------------------------------------------------------------- | ------ | ----- | ------------------------------------------------------------------------------------------------- |
| 001 | [Setup tooling](001-setup-tooling.md)                                                 | done   | —     | —                                                                                                 |
| 002 | [Parse backlog.md](002-parse-backlog-md.md)                                           | done   | —     | [001](001-setup-tooling.md)                                                                       |
| 003 | [Parse feature index](003-parse-feature-index.md)                                     | done   | —     | [001](001-setup-tooling.md)                                                                       |
| 004 | [Parse task files](004-parse-task-files.md)                                           | done   | —     | [001](001-setup-tooling.md)                                                                       |
| 005 | [Cross-link and derive feature status](005-cross-link-and-derive-feature-status.md)   | done   | —     | [002](002-parse-backlog-md.md), [003](003-parse-feature-index.md), [004](004-parse-task-files.md) |
| 006 | [Emit canonical JSON](006-emit-canonical-json.md)                                     | done   | —     | [005](005-cross-link-and-derive-feature-status.md)                                                |
| 007 | [Add fixture-based tests](007-add-fixture-based-tests.md)                             | done   | —     | [006](006-emit-canonical-json.md)                                                                 |
| 008 | [CLI entry point](008-cli-entry-point.md)                                             | done   | —     | [006](006-emit-canonical-json.md)                                                                 |
| 009 | [Add fetch capability](009-add-fetch-capability.md)                                   | todo   | —     | —                                                                                                 |
| 010 | [Implement URL detection](010-implement-url-detection.md)                             | todo   | —     | [009](009-add-fetch-capability.md)                                                                |
| 011 | [Handle remote file fetching](011-handle-remote-file-fetching.md)                     | todo   | —     | [010](010-implement-url-detection.md)                                                             |
| 012 | [Update CLI argument parsing](012-update-cli-argument-parsing.md)                     | todo   | —     | [011](011-handle-remote-file-fetching.md)                                                         |
| 013 | [Add error handling for network errors](013-add-error-handling-for-network-errors.md) | todo   | —     | [011](011-handle-remote-file-fetching.md)                                                         |
| 014 | [Write tests for remote file support](014-write-tests-for-remote-file-support.md)     | todo   | —     | [012](012-update-cli-argument-parsing.md), [013](013-add-error-handling-for-network-errors.md)    |
