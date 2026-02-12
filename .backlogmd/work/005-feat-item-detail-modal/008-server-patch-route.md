<!-- METADATA -->

```
Task: Server PATCH route
Status: done
Priority: 008
```

<!-- /METADATA -->
<!-- DESCRIPTION -->

## Description

Add a PATCH /api/tasks/:source endpoint to the serve server that uses @backlogmd/writer to update task statuses on disk and triggers SSE reload.

<!-- /DESCRIPTION -->

<!-- ACCEPTANCE CRITERIA -->

## Acceptance criteria

- [ ] PATCH /api/tasks/:source accepts {status} body
- [ ] Uses BacklogDocument to change task status and commit
- [ ] Notifies SSE clients after successful write
- [ ] Returns appropriate error codes (400, 404, 500)

<!-- /ACCEPTANCE CRITERIA -->
