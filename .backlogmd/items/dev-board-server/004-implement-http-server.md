# Implement HTTP server

- **Status:** done
- **Priority:** 004
- **Owner:** —
- **Item:** [Dev Board Server](../../backlog.md#003---dev-board-server)
- **Depends on:** [002 - Implement file watcher](002-implement-file-watcher.md), [003 - Build HTML template](003-build-html-template.md)
- **Blocks:** [005 - Wire up public API and CLI](005-wire-up-public-api-and-cli.md)

## Description

Create `src/server.ts` using `node:http` with 3 routes: `GET /` (HTML board via `renderHtml()`), `GET /api/backlog` (JSON response with `BacklogOutput`), `GET /events` (SSE stream). Maintains `Set<ServerResponse>` of SSE clients and notifies them when file changes are detected. Re-runs `buildBacklogOutput()` on each request — parsing is fast enough that no caching is needed.

## Acceptance Criteria

- [x] `GET /` returns HTML from `renderHtml()` with status 200
- [x] `GET /api/backlog` returns `BacklogOutput` as JSON
- [x] `GET /events` returns SSE stream with correct headers
- [x] SSE clients receive `data: reload` message when `notifyClients()` is called
- [x] Disconnected SSE clients are cleaned up
- [x] `createServer()` returns `{ server, notifyClients }` for testability
