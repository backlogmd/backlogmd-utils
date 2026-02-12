<!-- METADATA -->

```
Task: Render Type Badge
Status: done
Priority: 002
DependsOn: [001-extract-type-from-slug](001-extract-type-from-slug.md)
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Render a colored type badge in ItemCard.tsx when `item.type` is present. Color mapping: feat = blue, fix = red, refactor = amber, chore = slate. Badge appears below the item name, before the progress bar.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [x] Badge renders only when type is present
- [x] Correct color for each type (feat=blue, fix=red, refactor=amber, chore=slate)
- [x] Badge positioned below name, above progress bar

<!-- /ACCEPTANCE CRITERIA -->
