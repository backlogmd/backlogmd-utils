# Build HTML template

- **Status:** done
- **Priority:** 003
- **Owner:** —
- **Item:** [Dev Board Server](../../backlog.md#003---dev-board-server)
- **Depends on:** [001 - Scaffold serve package](001-scaffold-serve-package.md)
- **Blocks:** [004 - Implement HTTP server](004-implement-http-server.md)

## Description

Create `src/html.ts` with `renderHtml(BacklogOutput)` that returns a complete HTML page. Uses Tailwind Play CDN, 3-column grid layout, feature cards with task progress bars, and embedded vanilla JS with `EventSource` for SSE live updates. Initial data is embedded as `window.__BACKLOG__` for instant first render. Layout is responsive — stacks on mobile, 3 columns on desktop.

## Acceptance Criteria

- [x] `renderHtml()` returns valid HTML with Tailwind Play CDN script tag
- [x] Page has 3 columns: Todo, In Progress, Done
- [x] Feature cards display name, description (truncated), and task progress bar
- [x] Embedded JS includes `EventSource("/events")` for live reload
- [x] Initial data embedded as `window.__BACKLOG__` for instant first render
- [x] Layout is responsive (stacks on mobile, 3 columns on desktop)
