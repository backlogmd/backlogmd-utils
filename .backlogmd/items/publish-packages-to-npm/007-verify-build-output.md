# Verify build output

- **Status:** done
- **Priority:** 007
- **Owner:** agent
- **Item:** [Publish packages to npm](../../backlog.md#004---publish-packages-to-npm)
- **Depends on:** [001 - Trim parser public API](001-trim-parser-public-api.md), [004 - Add build and publish scripts](004-add-build-and-publish-scripts.md)
- **Blocks:** [008 - Set up GitHub Actions publish workflow](008-set-up-github-actions-publish-workflow.md)

## Description

Build both packages and run `npm pack --dry-run` to verify the published tarball contents are correct. Confirm that parser includes `dist/index.js`, `dist/index.d.ts`, and all necessary declaration files. Confirm that serve includes `dist/` (server code) and `app/dist/` (built Vite SPA). Ensure no source files, tests, or config files leak into the published package.

## Acceptance Criteria

- [x] `npm run build -w @backlogmd/parser` succeeds and produces `dist/` with `.js` and `.d.ts` files
- [x] `npm run build -w @backlogmd/serve` succeeds and produces `dist/` and `app/dist/`
- [x] `npm pack --dry-run -w @backlogmd/parser` shows only `dist/` files and `package.json`
- [x] `npm pack --dry-run -w @backlogmd/serve` shows only `dist/`, `app/dist/`, and `package.json`
- [x] No test files, source `.ts` files, or config files appear in the pack output
