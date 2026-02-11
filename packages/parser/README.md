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

console.log(output.items); // RoadmapItem[]
console.log(output.itemFolders); // ItemFolder[]
console.log(output.tasks); // Task[]
console.log(output.validation); // { errors, warnings }
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

## Task Table Formats

The parser supports both 4-column and 5-column task table formats:

### 4-Column Format (Without Dependencies)

Use this format when projects don't need dependency tracking:

```md
| #   | Task                                | Status | Owner  |
| --- | ----------------------------------- | ------ | ------ |
| 001 | [Setup project](001-setup.md)       | todo   | @alice |
| 002 | [Implement feature](002-feature.md) | done   | —      |
```

### 5-Column Format (With Dependencies)

Use this format when projects need to track task dependencies:

```md
| #   | Task                                | Status | Owner  | Depends on |
| --- | ----------------------------------- | ------ | ------ | ---------- |
| 001 | [Setup project](001-setup.md)       | todo   | @alice | —          |
| 002 | [Implement feature](002-feature.md) | done   | @bob   | 001        |
```

Both formats are fully supported by the parser. When using 4-column format, task dependencies default to an empty array.

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
