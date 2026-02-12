<!-- METADATA -->

```
Task: Create Parse Slug Utility
Status: done
Priority: 002
DependsOn: [001-add-itemtype-to-types](001-add-itemtype-to-types.md)
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Create `packages/parser/src/parse-slug.ts` with a `parseItemType()` function that extracts the Conventional Commits type from an item slug.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [ ] parseItemType extracts feat, fix, refactor, chore from slugs
- [ ] Returns null for slugs without a type segment

<!-- /ACCEPTANCE CRITERIA -->
