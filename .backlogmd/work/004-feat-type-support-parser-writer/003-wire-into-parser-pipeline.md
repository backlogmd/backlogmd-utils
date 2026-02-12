<!-- METADATA -->

```
Task: Wire into Parser Pipeline
Status: done
Priority: 003
DependsOn: [002-create-parse-slug-util](002-create-parse-slug-util.md)
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Wire `parseItemType()` into `parse-backlog.ts` and `parse-item-index.ts` so that `BacklogEntry` and `ItemFolder` include the parsed `type` field.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [ ] parse-backlog.ts populates type on BacklogEntry
- [ ] parse-item-index.ts populates type on ItemFolder
- [ ] BacklogOutput includes type fields in entries and items

<!-- /ACCEPTANCE CRITERIA -->
