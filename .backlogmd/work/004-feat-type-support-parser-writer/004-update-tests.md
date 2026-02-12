<!-- METADATA -->

```
Task: Update Tests
Status: done
Priority: 004
DependsOn: [003-wire-into-parser-pipeline](003-wire-into-parser-pipeline.md)
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Update parser tests to assert on the new `type` field in parsed entries and item folders. Update golden fixtures if needed.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [ ] parse-backlog tests verify type field
- [ ] parse-feature-index tests verify type field
- [ ] Integration/emit tests pass with type in output
- [ ] Golden fixtures updated if needed

<!-- /ACCEPTANCE CRITERIA -->
