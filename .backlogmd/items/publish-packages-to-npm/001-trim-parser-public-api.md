# Trim parser public API

- **Status:** done
- **Priority:** 001
- **Owner:** agent
- **Item:** [Publish packages to npm](../../backlog.md#004---publish-packages-to-npm)
- **Depends on:** —
- **Blocks:** [002 - Fix root CLI imports](002-fix-root-cli-imports.md), [007 - Verify build output](007-verify-build-output.md)

## Description

Remove internal exports from `packages/parser/src/index.ts` so the published package only exposes the high-level pipeline API. Keep `buildBacklogOutput`, `serializeOutput`, `writeOutput`, and all types (`BacklogOutput`, `RoadmapFeature`, `FeatureFolder`, `Task`, `TaskStub`, `AcceptanceCriterion`, `ValidationIssue`, `FeatureStatus`, `FeatureFolderStatus`, `TaskStatus`, `CrossLinkResult`). Remove `parseBacklog`, `parseFeatureIndex`, `parseTaskFile`, `crossLink`, `parseMd`, `isUrl`, and `fetchContent` from the public surface.

## Acceptance Criteria

- [x] `packages/parser/src/index.ts` only exports high-level functions and types
- [x] `parseBacklog`, `parseFeatureIndex`, `parseTaskFile`, `crossLink`, `parseMd`, `isUrl`, `fetchContent` are no longer re-exported
- [x] Internal modules remain importable within the monorepo via relative paths
- [x] TypeScript compiles without errors
