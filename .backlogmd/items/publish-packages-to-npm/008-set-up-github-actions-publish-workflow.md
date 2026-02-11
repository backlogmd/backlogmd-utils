# Set up GitHub Actions publish workflow

- **Status:** done
- **Priority:** 008
- **Owner:** agent
- **Item:** [Publish packages to npm](../../backlog.md#004---publish-packages-to-npm)
- **Depends on:** [007 - Verify build output](007-verify-build-output.md)
- **Blocks:** —

## Description

Create `.github/workflows/publish.yml` that triggers on GitHub release publication. The workflow should detect the tag prefix (`parser-v*` or `serve-v*`) to determine which package to publish. Steps: checkout, setup Node 22, `npm ci`, run tests for the target package, build, and `npm publish` using the `NODE_AUTH_TOKEN` secret. Requires adding an `NPM_TOKEN` secret to the GitHub repository settings.

## Acceptance Criteria

- [x] `.github/workflows/publish.yml` exists and is valid YAML
- [x] Workflow triggers on `release` event with type `published`
- [x] Tag prefix `parser-v*` triggers publish of `@backlogmd/parser`
- [x] Tag prefix `serve-v*` triggers publish of `@backlogmd/serve`
- [x] Workflow runs tests before publishing
- [x] Workflow uses `NODE_AUTH_TOKEN` from repository secrets
- [x] Workflow uses Node 22 matching the project's engine requirement
