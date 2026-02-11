# Fix parser to handle variable column counts in task tables

- **Status:** todo
- **Priority:** 002
- **Owner:** —
- **Item:** [Fix backlogmd-serve parser table column validation](../../backlog.md#002---fix-backlogmd-serve-parser-table-column-validation)

## Description

Modify the parser to gracefully handle task tables with different column counts instead of crashing with a hard error. The parser should handle the common 4-column format (#, Task, Status, Owner) as shown in the GitHub issue.

## Acceptance Criteria

- [ ] Update parseTaskRow function to handle 4-column task tables
- [ ] Ensure backward compatibility with any existing 5-column formats
- [ ] Parser should not crash on the failing item from the GitHub issue
- [ ] Test the fix with the exact content that was failing
