# Add markdown parsing error handling

- **Status:** todo
- **Priority:** 003
- **Owner:** —
- **Item:** [Improve error handling for malformed task tables](../../backlog.md#005---improve-error-handling-malformed-tables)
- **Depends on:** —
- **Blocks:** [004 - Detect mixed column formats](004-detect-mixed-column-formats.md), [005 - Improve error messages with context](005-improve-error-messages-context.md)

## Description

Wrap markdown parsing in try-catch blocks with graceful error handling to prevent parser crashes on invalid markdown syntax and provide actionable error messages.

## Acceptance Criteria

- [ ] Wrap parseMd() calls in try-catch blocks throughout the parser
- [ ] Catch malformed markdown syntax errors with specific handling
- [ ] Provide clear error messages that identify the type of markdown syntax error
- [ ] Include line number or location context when available from the parser
- [ ] Add tests for malformed markdown table syntax (missing separators, etc.)
- [ ] Add tests for malformed headings, lists, and other markdown elements
- [ ] Ensure partial parsing continues when possible for mixed content
- [ ] Error messages suggest specific fixes for common markdown issues
- [ ] Maintain existing error handling for already-covered cases
