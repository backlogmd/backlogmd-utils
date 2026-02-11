# Improve error messages with context

- **Status:** todo
- **Priority:** 005
- **Owner:** —
- **Item:** [Improve error handling for malformed task tables](../../backlog.md#005---improve-error-handling-malformed-tables)
- **Depends on:** [001 - Validate critical empty fields](001-validate-critical-empty-fields.md), [002 - Validate task link URLs](002-validate-task-link-urls.md), [003 - Add markdown parsing error handling](003-add-markdown-parsing-error-handling.md), [004 - Detect mixed column formats](004-detect-mixed-column-formats.md)

## Description

Enhance all error messages throughout the parser with row/column context, specific guidance, and actionable suggestions to help users quickly resolve parsing issues.

## Acceptance Criteria

- [ ] Include row number in all task-related error messages
- [ ] Include column context when applicable (column name/number)
- [ ] Provide specific suggestions for common parsing errors
- [ ] Update existing error messages throughout parseItemIndex function
- [ ] Update error messages in parseTaskRow function
- [ ] Update error messages in other parser functions
- [ ] Add tests verifying error message content includes proper context
- [ ] Ensure error messages are consistent in tone and format
- [ ] Include file path in all error messages for better debugging
- [ ] Add troubleshooting hints for the most common user mistakes
