# Validate task link URLs

- **Status:** todo
- **Priority:** 002
- **Owner:** —
- **Item:** [Improve error handling for malformed task tables](../../backlog.md#005---improve-error-handling-malformed-tables)
- **Depends on:** —
- **Blocks:** [003 - Add markdown parsing error handling](003-add-markdown-parsing-error-handling.md), [004 - Detect mixed column formats](004-detect-mixed-column-formats.md), [005 - Improve error messages with context](005-improve-error-messages-context.md)

## Description

Add validation for task file URLs in parseTaskRow function to prevent invalid references, potential security issues, and downstream file access errors.

## Acceptance Criteria

- [ ] Validate task file URL is not empty or whitespace only
- [ ] Prevent path traversal attempts (../, ../../, etc.)
- [ ] Prevent absolute path attempts (/absolute/path)
- [ ] Validate filename format (no invalid characters like <, >, :, \*, ?, ", |)
- [ ] Add tests for security edge cases (path traversal, invalid characters)
- [ ] Add tests for empty URL validation
- [ ] Maintain backwards compatibility with valid existing links
- [ ] Error messages clearly indicate the specific URL validation failure
