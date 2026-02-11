# Implement file watcher

- **Status:** done
- **Priority:** 002
- **Owner:** —
- **Item:** [Dev Board Server](../../backlog.md#003---dev-board-server)
- **Depends on:** [001 - Scaffold serve package](001-scaffold-serve-package.md)
- **Blocks:** [004 - Implement HTTP server](004-implement-http-server.md)

## Description

Create `src/watcher.ts` using `node:fs.watch` with `{ recursive: true }` and 300ms debounce. Only `.md` file changes trigger the callback. Returns `FSWatcher` for cleanup. Node 22 supports recursive watching natively on macOS and Linux.

## Acceptance Criteria

- [x] `watchBacklogDir()` accepts dir path, onChange callback, and optional debounceMs
- [x] Only `.md` file changes trigger the callback
- [x] Multiple rapid changes are debounced into a single callback
- [x] Returns `FSWatcher` that can be `.close()`'d
