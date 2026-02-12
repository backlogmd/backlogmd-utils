<!-- METADATA -->

```
Task: Add ItemType to Types Package
Status: done
Priority: 001
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Add an `ItemType` union type to `@backlogmd/types` and add an optional `type` field to `BacklogEntry` and `ItemFolder`. Export `ItemType` from the package index.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [ ] ItemType union exported from @backlogmd/types
- [ ] BacklogEntry has type: ItemType | null
- [ ] ItemFolder has type: ItemType | null

<!-- /ACCEPTANCE CRITERIA -->
