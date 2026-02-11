# Create LICENSE file

- **Status:** done
- **Priority:** 005
- **Owner:** agent
- **Item:** [Publish packages to npm](../../backlog.md#004---publish-packages-to-npm)
- **Depends on:** —
- **Blocks:** —

## Description

Create a root `LICENSE` file with the MIT license text. npm includes the LICENSE file from the package root or nearest parent automatically. Both sub-packages reference `"license": "MIT"` in their `package.json`, and the root LICENSE file satisfies the requirement for the npm package pages.

## Acceptance Criteria

- [x] `LICENSE` file exists at repo root
- [x] Contains valid MIT license text with correct year and copyright holder
