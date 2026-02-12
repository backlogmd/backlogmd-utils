<!-- METADATA -->

```
Task: Wire Filtering into Board
Status: done
Priority: 002
DependsOn: [001-add-search-input-to-header](001-add-search-input-to-header.md)
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Accept a `searchQuery` prop in `Board`. Filter `displayItems` by matching the query against `item.name` (case-insensitive) before grouping into columns. Column counts update accordingly.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [ ] Board accepts searchQuery prop
- [ ] Items are filtered by name match before grouping
- [ ] Column counts reflect filtered results
- [ ] Empty query shows all items

<!-- /ACCEPTANCE CRITERIA -->
