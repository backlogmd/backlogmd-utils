# Setup tooling

- **Status:** done
- **Priority:** 001
- **Owner:** —
- **Item:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)
- **Depends on:** —
- **Blocks:** [002 - Parse backlog.md](002-parse-backlog-md.md), [003 - Parse feature index](003-parse-feature-index.md), [004 - Parse task files](004-parse-task-files.md)

## Description

Bootstrap the project with Node 22 LTS (via `.nvmrc`), TypeScript (strict), pnpm, and the toolchain needed for the parser: remark (and remark-gfm) for Markdown as runtime dependencies, Vitest for tests, ESLint + typescript-eslint, and Prettier as dev dependencies. Add a minimal folder layout (`src/`, `tests/` with `fixtures/` and `golden/`), and scripts in `package.json` for build, test, and lint.

## Acceptance Criteria

- [ ] `.nvmrc` specifies Node 22; `nvm use` (or equivalent) works.
- [ ] `package.json` exists with pnpm; remark and remark-gfm as runtime dependencies; TypeScript, Vitest, ESLint, and Prettier as dev dependencies.
- [ ] `tsconfig.json` with strict mode; build output (e.g. `dist/`) configured.
- [ ] Vitest config runs tests from `tests/`; fixture and golden directories are in place.
- [ ] ESLint and Prettier run via scripts (`lint`, `format`); code is formatted on check.
- [ ] One passing smoke test (e.g. parse a single feature block or placeholder) so the pipeline is green.
