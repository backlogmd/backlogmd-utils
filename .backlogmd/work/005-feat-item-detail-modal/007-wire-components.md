<!-- METADATA -->

```
Task: Wire components together
Status: done
Priority: 007
DependsOn: [003-item-detail-modal-component](003-item-detail-modal-component.md)
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Wire the ItemDetailModal into Board, Column, and ItemCard. Add click handlers, selectedItem state, and SSE data sync so the modal stays current when data refreshes.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [ ] ItemCard is clickable and opens the modal
- [ ] Board manages selectedItem state
- [ ] Column forwards onItemSelect to ItemCard
- [ ] Modal updates when SSE data refreshes

<!-- /ACCEPTANCE CRITERIA -->
