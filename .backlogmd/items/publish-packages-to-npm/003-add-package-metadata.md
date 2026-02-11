# Add package metadata

- **Status:** done
- **Priority:** 003
- **Owner:** agent
- **Item:** [Publish packages to npm](../../backlog.md#004---publish-packages-to-npm)
- **Depends on:** —
- **Blocks:** [004 - Add build and publish scripts](004-add-build-and-publish-scripts.md)

## Description

Add required npm publishing metadata to both `packages/parser/package.json` and `packages/serve/package.json`: `license` (MIT), `author`, `repository` (with `directory` field pointing to the correct sub-package), `keywords` for discoverability, and `publishConfig` with `access: "public"` (required for scoped packages). Add `files: ["dist"]` to parser (serve already has `files`). Add `private: true` to the root `package.json` to prevent accidental publishing of the monorepo root.

## Acceptance Criteria

- [x] Both sub-package `package.json` files include `license`, `author`, `repository`, `keywords`, `publishConfig`
- [x] `packages/parser/package.json` has `"files": ["dist"]`
- [x] Root `package.json` has `"private": true`
- [x] `publishConfig.access` is `"public"` in both sub-packages
- [x] `repository.directory` points to the correct sub-package path
