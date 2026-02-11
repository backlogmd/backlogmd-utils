# Emit canonical JSON

- **Status:** todo
- **Priority:** 006
- **Owner:** —
- **Depends on:** [Setup tooling](001-setup-tooling.md)
- **Feature:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)

## Description

Define and implement the canonical JSON output. The top-level shape is:

```json
{
  "protocol": "backlogmd/v1",
  "generatedAt": "<ISO-8601>",
  "rootDir": "<absolute path to .backlogmd/>",
  "features": [
    {
      "id": "001",
      "name": "",
      "statusDeclared": "",
      "statusDerived": "",
      "sprint": "<slug|null>",
      "description": "",
      "tasks": ["<sprintSlug/priority>"],
      "source": ""
    }
  ],
  "sprints": [
    { "slug": "", "name": "", "status": "", "goal": "", "tasks": ["<priority>"], "source": "" }
  ],
  "tasks": [
    {
      "id": "<sprintSlug/priority>",
      "slug": "",
      "name": "",
      "status": "",
      "priority": "",
      "owner": "<string|null>",
      "featureId": "",
      "description": "",
      "acceptanceCriteria": [{ "text": "", "checked": false }],
      "source": ""
    }
  ],
  "validation": {
    "errors": [{ "code": "", "message": "", "source": "" }],
    "warnings": [{ "code": "", "message": "", "source": "" }]
  }
}
```

Support writing to a configurable path (stdout or a file).

## Acceptance Criteria

- [ ] Output conforms to the documented JSON shape (features, sprints, tasks, validation).
- [ ] Source locations are included for features, sprints, and tasks.
- [ ] Validation errors and warnings are serialized with code, message, and affected files.
- [ ] Output can be written to a file or stdout; encoding is UTF-8.
