# Create package READMEs

- **Status:** done
- **Priority:** 006
- **Owner:** agent
- **Item:** [Publish packages to npm](../../backlog.md#004---publish-packages-to-npm)
- **Depends on:** —
- **Blocks:** —

## Description

Create `README.md` files for both sub-packages. These are displayed on the npm package landing pages. The parser README should cover installation, the `buildBacklogOutput` function, `serializeOutput`, `writeOutput`, and the main types. The serve README should cover installation, CLI usage (`backlogmd-serve --dir --port --host`), and programmatic usage via `startServer(options)`.

## Acceptance Criteria

- [x] `packages/parser/README.md` exists with install instructions and API usage examples
- [x] `packages/serve/README.md` exists with install instructions, CLI flags, and programmatic API
- [x] Both READMEs include a brief description of what the package does
- [x] Code examples are correct and use the actual exported API
