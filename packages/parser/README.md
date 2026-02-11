# @backlogmd/parser

Parse [BacklogMD](https://github.com/backlogmd/backlogmd) markdown files into canonical JSON. Reads a `.backlogmd/` directory structure (backlog, items, tasks) and produces a single typed output with cross-links and validation.

## Installation

```bash
npm install @backlogmd/parser
```

Requires Node.js >= 22.

## Usage

### `buildBacklogOutput(rootDir)`

Reads a `.backlogmd/` directory, parses all markdown files, cross-links items and tasks, and returns a `BacklogOutput` object.

```ts
import { buildBacklogOutput, serializeOutput } from "@backlogmd/parser";

const output = buildBacklogOutput(".backlogmd");

console.log(output.items);        // RoadmapItem[]
console.log(output.itemFolders);  // ItemFolder[]
console.log(output.tasks);        // Task[]
console.log(output.validation);   // { errors, warnings }
```

### `serializeOutput(output)`

Converts a `BacklogOutput` object into a formatted JSON string.

```ts
const json = serializeOutput(output);
console.log(json);
```

### `writeOutput(output, outputPath?)`

Serializes and optionally writes the output to a file. Returns the JSON string.

```ts
import { writeOutput } from "@backlogmd/parser";

// Write to file
writeOutput(output, "backlog.json");

// Or just get the string
const json = writeOutput(output);
```

## Types

The package exports the following TypeScript types:

- **`BacklogOutput`** — top-level output containing items, item folders, tasks, and validation results
- **`RoadmapItem`** — an item entry from `backlog.md`
- **`ItemFolder`** — a parsed item `index.md` with task stubs
- **`Task`** — a fully parsed task file
- **`TaskStub`** — a task reference from an item's task table
- **`AcceptanceCriterion`** — a checkbox item from a task's acceptance criteria
- **`ValidationIssue`** — an error or warning from cross-link validation
- **`CrossLinkResult`** — the result of cross-linking items, folders, and tasks
- **`ItemStatus`** — `"todo" | "in-progress" | "done"`
- **`ItemFolderStatus`** — `"open" | "archived"`
- **`TaskStatus`** — `"todo" | "in-progress" | "ready-to-review" | "ready-to-test" | "done"`

## License

MIT
