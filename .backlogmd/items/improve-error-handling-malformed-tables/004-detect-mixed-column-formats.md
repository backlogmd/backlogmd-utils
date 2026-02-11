# Detect mixed column formats

- **Status:** todo
- **Priority:** 004
- **Owner:** —
- **Item:** [Improve error handling for malformed task tables](../../backlog.md#005---improve-error-handling-malformed-tables)
- **Depends on:** —
- **Blocks:** [005 - Improve error messages with context](005-improve-error-messages-context.md)

## Description

Add validation to detect and report inconsistent column counts within the same task table to prevent confusing parsing behavior and provide clear guidance to users.

## Acceptance Criteria

- [ ] Detect when table has both 4-column and 5-column rows mixed together
- [ ] Provide clear error message identifying the mixed format issue
- [ ] Suggest consistent format to user (either all 4-column or all 5-column)
- [ ] Include row numbers of inconsistent rows in error message
- [ ] Continue to support pure 4-column and pure 5-column formats without errors
- [ ] Add tests for tables with mixed column counts
- [ ] Add tests for pure 4-column format (should not trigger error)
- [ ] Add tests for pure 5-column format (should not trigger error)
- [ ] Error message explains how to fix the mixed format issue
