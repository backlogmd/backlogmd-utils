<!-- METADATA -->

```
Task: Wire Modal to Board
Status: done
Priority: 003
DependsOn: [002-add-button-to-column](002-add-button-to-column.md)
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Add modal open/close state management to the `Board` component. Pass the `onAdd` handler only to the Open column. Render the `AddWorkModal` and connect it to the state. Submit currently logs to console only.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [ ] Board manages modal open/close state
- [ ] Only the Open column shows the + button
- [ ] AddWorkModal renders when state is open
- [ ] Submit logs textarea content to console and closes modal

<!-- /ACCEPTANCE CRITERIA -->
