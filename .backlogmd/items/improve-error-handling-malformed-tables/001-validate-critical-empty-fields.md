# Validate critical empty fields

- **Status:** todo
- **Priority:** 001
- **Owner:** —
- **Item:** [Improve error handling for malformed task tables](../../backlog.md#005---improve-error-handling-malformed-tables)
- **Depends on:** —
- **Blocks:** [002 - Validate task link URLs](002-validate-task-link-urls.md), [003 - Add markdown parsing error handling](003-add-markdown-parsing-error-handling.md), [004 - Detect mixed column formats](004-detect-mixed-column-formats.md), [005 - Improve error messages with context](005-improve-error-messages-context.md)

## Description

Add validation for empty priority and task name fields in parseTaskRow function to prevent creation of invalid TaskStub objects that could cause downstream issues.

## Acceptance Criteria

- [ ] Throw clear error when priority field is empty or whitespace only
- [ ] Throw clear error when task name/link text is empty or whitespace only
- [ ] Add unit tests for empty priority field validation
- [ ] Add unit tests for empty task name validation
- [ ] Ensure existing functionality remains unchanged for valid inputs
- [ ] Error messages include row number for better debugging
