# Write tests

- **Status:** done
- **Priority:** 006
- **Owner:** —
- **Feature:** [Dev Board Server](../../backlog.md#003---dev-board-server)
- **Depends on:** [005 - Wire up public API and CLI](005-wire-up-public-api-and-cli.md)
- **Blocks:** —

## Description

Create test suite in `packages/serve/tests/` covering all modules: watcher (temp dir + file write triggers callback), html (mock `BacklogOutput` produces correct HTML structure), server (HTTP requests to all 3 routes return expected status codes and content types), and CLI (`parseArgs` handles all flag combinations and defaults).

## Acceptance Criteria

- [x] Watcher test: callback fires when `.md` file is written to watched dir
- [x] HTML test: output contains column headers, feature names, Tailwind CDN tag
- [x] Server test: correct status codes and content types for all 3 routes
- [x] Server test: SSE endpoint returns `text/event-stream` content type
- [x] CLI test: `parseArgs` handles all flag combinations and defaults
- [x] All tests pass with `npm test -w @backlogmd/serve`
