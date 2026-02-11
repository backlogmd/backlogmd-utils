# Add fixture-based tests

- **Status:** done
- **Priority:** 007
- **Owner:** —
- **Feature:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)
- **Depends on:** [006 - Emit canonical JSON](006-emit-canonical-json.md)
- **Blocks:** —

## Description

Add end-to-end integration tests that run the full parser pipeline on a small set of Markdown fixtures (minimal valid backlog, one feature folder, a few tasks). Individual parser unit tests live in tasks 002–004; this task covers the full pipeline from markdown input to JSON output. Capture the expected JSON as golden files. Tests assert that the parser output matches the golden JSON (or a normalized form). Include at least one fixture that triggers validation warnings (e.g. status mismatch) and assert the expected warnings appear.

## Acceptance Criteria

- [ ] Fixture directory contains valid BacklogMD markdown (backlog.md, one feature folder, ≥2 tasks).
- [ ] Golden JSON file(s) define expected output for the happy path.
- [ ] Test run parses fixtures and compares output to golden (structure and key fields).
- [ ] At least one test validates that validation warnings are produced when expected.
