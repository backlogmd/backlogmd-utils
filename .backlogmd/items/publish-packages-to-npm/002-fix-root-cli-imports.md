# Fix root CLI imports

- **Status:** done
- **Priority:** 002
- **Owner:** agent
- **Item:** [Publish packages to npm](../../backlog.md#004---publish-packages-to-npm)
- **Depends on:** [001 - Trim parser public API](001-trim-parser-public-api.md)
- **Blocks:** —

## Description

After trimming the parser's public API, the root `src/cli.ts` imports `isUrl` and `fetchContent` from `@backlogmd/parser` which will no longer be available. Update the import to use a relative path to the parser source (`../packages/parser/src/fetch.js`) since the root CLI is not published and can access internal modules directly.

## Acceptance Criteria

- [x] `src/cli.ts` imports `isUrl` and `fetchContent` via relative path instead of `@backlogmd/parser`
- [x] `src/cli.ts` still imports `buildBacklogOutput` and `serializeOutput` from `@backlogmd/parser`
- [x] Root CLI builds and runs correctly (`npm run build && node dist/cli.js --help`)
- [x] Existing CLI tests pass
