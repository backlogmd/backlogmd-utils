# @backlogmd/parser

Parse [BacklogMD](https://github.com/backlogmd/backlogmd) markdown into canonical JSON. Reads a root directory’s **work/** tree (item index and task files) and produces typed output with cross-links and validation.

## Installation

```bash
npm install @backlogmd/parser
```

Requires Node.js >= 22.

## Usage

### `buildBacklogOutput(rootDir)`

Reads `rootDir/work/`, parses item index and task files, cross-links, and returns a `BacklogOutput` object.

```ts
import { buildBacklogOutput, serializeOutput } from "@backlogmd/parser";

const output = buildBacklogOutput("/path/to/root");

console.log(output.entries);  // BacklogEntry[] (derived from work/)
console.log(output.items);   // ItemFolder[]
console.log(output.tasks);   // Task[]
console.log(output.validation);  // { errors, warnings }
```

### `buildBacklogmdDocument(rootDir)`

Returns a **BacklogmdDocument** with `work` and `tasks`.

Task file formats supported:

- HTML comment sections (`<!-- METADATA -->`, `<!-- DESCRIPTION -->`, etc.)
- YAML frontmatter (`---` … `---`) with `Task`, `Status`, `Priority`, `DependsOn`, then `## Description` and `## Acceptance criteria` in the body.

Optional **task feedback files**: for `001-setup.md`, a file `001-setup-feedback.md` in the same directory is attached as `task.feedback` (`{ source, content }`).

```ts
import { buildBacklogmdDocument } from "@backlogmd/parser";

const doc = buildBacklogmdDocument("/path/to/root");

console.log(doc.work);   // WorkItem[]
console.log(doc.tasks);  // Task[]
console.log(doc.validation);
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

The package exports the following TypeScript types (from `@backlogmd/types`):

- **`BacklogOutput`** — legacy output: entries, items, tasks, validation
- **`BacklogmdDocument`** — document shape: work, tasks, validation (new structure)
- **`BacklogEntry`** — a work item entry (derived from work/ discovery)
- **`WorkItem`** — a work item with slug, type, task refs, source
- **`ItemFolder`** — parsed item `index.md` with task refs
- **`TaskRef`** — a task reference (slug, fileName) from an item's index
- **`Task`** — a fully parsed task file (optional `feedback` when `*-feedback.md` exists)
- **`TaskFeedback`** — optional feedback file for a task (`source`, `content`)
- **`AcceptanceCriterion`** — a checkbox item from acceptance criteria
- **`ValidationIssue`** — an error or warning
- **`TaskStatus`** — `"open" | "block" | "in-progress" | "done"`
- **`ItemStatus`** — derived: `"open" | "in-progress" | "done"`
- **`ItemType`** — `"feat" | "fix" | "refactor" | "chore"`

## License

MIT
