# @backlogmd/serve

Lightweight dev server that watches a `.backlogmd/` directory and serves a live-updating kanban board with Todo, In Progress, and Done columns.

## Installation

```bash
npm install @backlogmd/serve
```

Requires Node.js >= 22.

## CLI Usage

```bash
npx backlogmd-serve [options]
```

### Options

| Flag            | Description                                          | Default        |
| --------------- | ---------------------------------------------------- | -------------- |
| `--dir <path>`  | Path to `.backlogmd/` directory                      | `.backlogmd/`  |
| `--port <port>` | Port to listen on                                    | `3000`         |
| `--host <host>` | Host to bind to                                      | `localhost`    |
| `--help`        | Show help message                                    | —              |

### Example

```bash
# Serve the backlog in the current directory
npx backlogmd-serve

# Specify a custom directory and port
npx backlogmd-serve --dir ./my-project/.backlogmd --port 8080
```

## Programmatic Usage

```ts
import { startServer } from "@backlogmd/serve";

const server = startServer({
  dir: ".backlogmd",
  port: 3000,
  host: "localhost",
});

// Later, shut down gracefully
server.close();
```

### `startServer(options?)`

Starts the dev server and file watcher. Returns a `ServerHandle` with a `close()` method.

**Options:**

- `dir` — path to `.backlogmd/` directory (default: `".backlogmd"`)
- `port` — port number (default: `3000`)
- `host` — host to bind to (default: `"localhost"`)

## How It Works

The server watches the `.backlogmd/` directory for file changes. When markdown files are added, modified, or deleted, the parser re-processes the backlog and pushes updates to all connected browsers via Server-Sent Events. The kanban board renders items grouped by status: **Todo**, **In Progress**, and **Done**.

## License

MIT
