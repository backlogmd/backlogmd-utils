# Publish packages to npm

- **Type:** feature
- **Status:** open
- **Goal:** Prepare @backlogmd/parser and @backlogmd/serve for npm publishing with trimmed API surface, package metadata, and automated CI publishing via GitHub Actions.

## Tasks

| #   | Task                                                                                    | Status | Owner | Depends on                                                                        |
| --- | --------------------------------------------------------------------------------------- | ------ | ----- | --------------------------------------------------------------------------------- |
| 001 | [Trim parser public API](001-trim-parser-public-api.md)                                 | done   | agent | —                                                                                 |
| 002 | [Fix root CLI imports](002-fix-root-cli-imports.md)                                     | done   | agent | [001](001-trim-parser-public-api.md)                                              |
| 003 | [Add package metadata](003-add-package-metadata.md)                                     | done   | agent | —                                                                                 |
| 004 | [Add build and publish scripts](004-add-build-and-publish-scripts.md)                   | done   | agent | [003](003-add-package-metadata.md)                                                |
| 005 | [Create LICENSE file](005-create-license-file.md)                                       | done   | agent | —                                                                                 |
| 006 | [Create package READMEs](006-create-package-readmes.md)                                 | done   | agent | —                                                                                 |
| 007 | [Verify build output](007-verify-build-output.md)                                       | done   | agent | [001](001-trim-parser-public-api.md), [004](004-add-build-and-publish-scripts.md) |
| 008 | [Set up GitHub Actions publish workflow](008-set-up-github-actions-publish-workflow.md) | done   | agent | [007](007-verify-build-output.md)                                                 |
