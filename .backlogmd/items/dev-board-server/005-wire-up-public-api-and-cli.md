# Wire up public API and CLI

- **Status:** done
- **Priority:** 005
- **Owner:** —
- **Item:** [Dev Board Server](../../backlog.md#003---dev-board-server)
- **Depends on:** [004 - Implement HTTP server](004-implement-http-server.md)
- **Blocks:** [006 - Write tests](006-write-tests.md)

## Description

Create `src/index.ts` exporting `startServer()` that wires the HTTP server and file watcher together, returning `{ close() }` for graceful shutdown. Create `src/cli.ts` as the bin entry point with `--dir`, `--port`, `--host` flags following the existing CLI argument parsing pattern from root `src/cli.ts`.

## Acceptance Criteria

- [x] `startServer(options)` starts HTTP server and file watcher
- [x] Returns `{ close() }` for graceful shutdown
- [x] CLI parses `--dir`, `--port`, `--host`, `--help` flags
- [x] Default dir is `.backlogmd/` in cwd, port 3000, host localhost
- [x] Logs board URL to stderr on startup
- [x] Exits with error if dir doesn't exist
