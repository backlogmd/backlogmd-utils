# Add build and publish scripts

- **Status:** done
- **Priority:** 004
- **Owner:** agent
- **Item:** [Publish packages to npm](../../backlog.md#004---publish-packages-to-npm)
- **Depends on:** [003 - Add package metadata](003-add-package-metadata.md)
- **Blocks:** [007 - Verify build output](007-verify-build-output.md)

## Description

Add `clean` and `prepublishOnly` scripts to both sub-packages so that `npm publish` always produces a fresh build. The `clean` script removes the `dist/` directory, and `prepublishOnly` chains `clean` then `build`. For serve, the existing `build` script already chains `build:app && build:server`, so prepublishOnly will trigger the full pipeline including the Vite SPA build.

## Acceptance Criteria

- [x] Both sub-packages have a `clean` script that removes `dist/`
- [x] Both sub-packages have a `prepublishOnly` script that runs `clean` then `build`
- [x] Running `npm publish --dry-run` in each sub-package triggers the prepublishOnly hook
- [x] Serve's prepublishOnly builds both the Vite app and the server TypeScript
