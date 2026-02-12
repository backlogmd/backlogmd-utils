<!-- METADATA -->

```
Task: Extract Type from Slug
Status: done
Priority: 001
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Add a `slugToType()` helper to Board.tsx that extracts the Conventional Commits type (feat, fix, refactor, chore) from an item slug. Add a `type` field to `DisplayItem` and populate it when building display items.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [x] slugToType extracts feat, fix, refactor, chore from slugs
- [x] Returns null for slugs without a type segment
- [x] DisplayItem interface includes type: string | null
- [x] type is populated when building displayItems

<!-- /ACCEPTANCE CRITERIA -->
