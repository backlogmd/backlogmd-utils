# CLI entry point

- **Status:** done
- **Priority:** 008
- **Owner:** —
- **Feature:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)
- **Depends on:** [006 - Emit canonical JSON](006-emit-canonical-json.md)
- **Blocks:** —

## Description

Add a CLI entry point so the parser can be invoked as `npx backlogmd-parser` or via a `bin` field in `package.json`. The CLI should accept an optional `--root` argument (defaults to `.backlogmd/` in the current directory) and an optional `--output` argument (defaults to stdout). Wire up the full pipeline: parse backlog, features, and tasks, cross-link, then emit JSON.

## Acceptance Criteria

- [ ] `bin` field in `package.json` points to a compiled entry script.
- [ ] `--root <path>` overrides the default `.backlogmd/` directory.
- [ ] `--output <path>` writes JSON to a file instead of stdout.
- [ ] `--help` prints usage information.
- [ ] Exit code is 0 on success, 1 if validation errors are present.
- [ ] Unit tests cover argument parsing and error exit codes.
