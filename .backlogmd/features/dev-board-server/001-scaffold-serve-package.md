# Scaffold serve package

- **Status:** done
- **Priority:** 001
- **Owner:** —
- **Feature:** [Dev Board Server](../../backlog.md#003---dev-board-server)
- **Depends on:** —
- **Blocks:** [002 - Implement file watcher](002-implement-file-watcher.md), [003 - Build HTML template](003-build-html-template.md)

## Description

Create `packages/serve/` with `package.json` and `tsconfig.json` matching parser conventions. Add `@backlogmd/serve` workspace to root `package.json`. Update root build script. The package should declare `@backlogmd/parser` as a runtime dependency and expose a `backlogmd-serve` bin entry point.

## Acceptance Criteria

- [x] `packages/serve/package.json` exists with correct name, type, exports, bin, engines
- [x] `packages/serve/tsconfig.json` matches parser config (ES2022, Node16, strict)
- [x] Root `package.json` lists `packages/serve` in workspaces
- [x] `npm install` links workspaces successfully
- [x] `npm run build -w @backlogmd/serve` compiles without errors
