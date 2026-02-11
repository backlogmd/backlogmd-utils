# Add tests to prevent regression

- **Status:** todo
- **Priority:** 003
- **Owner:** —
- **Item:** [Fix backlogmd-serve parser table column validation](../../backlog.md#002---fix-backlogmd-serve-parser-table-column-validation)

## Description

Create comprehensive tests for the parser to ensure it handles various task table formats correctly and prevent future regressions of this column validation issue.

## Acceptance Criteria

- [ ] Add unit tests for parseTaskRow with 4-column tables
- [ ] Add unit tests for parseTaskRow with 5-column tables (if still supported)
- [ ] Add integration tests using the exact failing content from the GitHub issue
- [ ] Ensure all tests pass and coverage is maintained
