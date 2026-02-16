# Releasing packages to npm

This repo uses [Changesets](https://github.com/changesets/changesets) to version and publish the 8 packages (`@backlogmd/types`, `@backlogmd/parser`, `@backlogmd/writer`, `@backlogmd/serve`, `@backlogmd/core`, `@backlogmd/vcs`, `@backlogmd/workers`, `@backlogmd/autopilot`).

## 1. Add a changeset (when you make a change)

From the repo root:

```bash
npm run changeset
```

- Select the package(s) you changed (space to toggle, enter to confirm).
- Choose the bump type: **patch** (bug fixes), **minor** (new features), **major** (breaking changes).
- Write a one-line summary (it will appear in the package CHANGELOG).

Commit the new file under `.changeset/` (e.g. `my-change.md`) with your PR.

## 2. Version (apply changesets and bump versions)

When you’re ready to release:

```bash
npm run version
```

This will:

- Bump `version` in each affected `package.json`
- Update internal dependency ranges (e.g. `@backlogmd/parser` in `@backlogmd/writer`)
- Generate/update CHANGELOGs
- Remove the consumed `.changeset/*.md` files

Commit and push the version and CHANGELOG updates (e.g. `Version packages`).

## 3. Publish

**Option A – From your machine**

```bash
npm run release
```

This runs `build:all` then publishes every package whose current version is not yet on npm. You need `NPM_TOKEN` or to be logged in with `npm login`.

**Option B – From GitHub Actions**

Create a **GitHub Release** (tag name can be anything, e.g. `v2.0.0`). The **Publish to npm** workflow will:

1. Checkout, install, build all packages, run tests
2. Run `changeset publish` (publishes only new versions)

Ensure the repo has an `NPM_TOKEN` secret (npm automation token) with publish access.

## Summary

| Step        | Command / action |
|------------|-------------------|
| Add change  | `npm run changeset` → commit `.changeset/*.md` |
| Bump versions | `npm run version` → commit version + CHANGELOGs |
| Publish    | `npm run release` locally, or create a GitHub Release for CI |

You can release one package or many at once; only packages with a version bump (from changesets) get new versions, and only versions not on npm get published.
