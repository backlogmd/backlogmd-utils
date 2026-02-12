<!-- METADATA -->

```
Task: useTaskStatusUpdate hook
Status: done
Priority: 005
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Create a custom React hook that encapsulates the PATCH API call for task status updates, tracks pending tasks, and handles errors.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [ ] Calls PATCH /api/tasks/:encodedSource with correct body
- [ ] Tracks pending task sources during in-flight requests
- [ ] Clears pending on success
- [ ] Sets error state on failure

<!-- /ACCEPTANCE CRITERIA -->
