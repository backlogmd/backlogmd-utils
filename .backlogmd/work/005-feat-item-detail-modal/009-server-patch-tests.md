<!-- METADATA -->

```
Task: Server PATCH endpoint tests
Status: done
Priority: 009
DependsOn: [008-server-patch-route](008-server-patch-route.md)
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Add integration tests for the PATCH /api/tasks/:source endpoint covering success, 404, 400, and SSE notification.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [ ] Test: PATCH returns 200 and updates task file on disk
- [ ] Test: Returns 404 for unknown task
- [ ] Test: Returns 400 for invalid status
- [ ] Test: Triggers SSE reload after patch

<!-- /ACCEPTANCE CRITERIA -->
