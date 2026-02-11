# Emit canonical JSON

- **Status:** done
- **Priority:** 006
- **Owner:** —
- **Feature:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)
- **Depends on:** [005 - Cross-link and derive feature status](005-cross-link-and-derive-feature-status.md)
- **Blocks:** [007 - Add fixture-based tests](007-add-fixture-based-tests.md), [008 - CLI entry point](008-cli-entry-point.md)

## Description

Define and implement the canonical JSON output. The top-level shape is:

```json
{
  "protocol": "backlogmd/v1",
  "generatedAt": "<ISO-8601>",
  "rootDir": "<absolute path to .backlogmd/>",
  "features": [{ "id": "001", "name": "", "statusDeclared": "", "statusDerived": "", "slug": "<feature-slug|null>", "description": "", "tasks": ["<featureSlug/priority>"], "source": "" }],
  "featureFolders": [{ "slug": "", "name": "", "status": "", "goal": "", "tasks": ["<priority>"], "source": "" }],
  "tasks": [{ "id": "<featureSlug/priority>", "slug": "", "name": "", "status": "", "priority": "", "owner": "<string|null>", "featureId": "", "dependsOn": [], "blocks": [], "description": "", "acceptanceCriteria": [{ "text": "", "checked": false }], "source": "" }],
  "validation": { "errors": [{ "code": "", "message": "", "source": "" }], "warnings": [{ "code": "", "message": "", "source": "" }] }
}
```

Support writing to a configurable path (stdout or a file).

## Acceptance Criteria

- [ ] Output conforms to the documented JSON shape (features, featureFolders, tasks, validation).
- [ ] Source locations are included for features, feature folders, and tasks.
- [ ] Task dependencies (`dependsOn`, `blocks`) are serialized.
- [ ] Validation errors and warnings are serialized with code, message, and affected files.
- [ ] Output can be written to a file or stdout; encoding is UTF-8.
