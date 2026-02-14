<!-- METADATA -->

```yaml
t: Implement chat command parsing in /api/chat
s: done
p: 10
dep: []
a: ""
h: false
expiresAt: null
```

<!-- DESCRIPTION -->

## Description

Implement command parsing in the `/api/chat` endpoint to support:

- `/work <taskId>` - runs any task using `runWorkById(taskId)` without changing status
- `/task <taskId>` - runs any task using `runTaskById(taskId)` and updates status (ip→done)
- `/plan <taskId>` - runs a task in plan status using `runPlanTask(taskId)`
- Direct prompt - uses `executePrompt(message)` when no command is detected

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Parse message to detect commands starting with /work, /task, or /plan
- [x] Extract task ID from command arguments
- [x] Call appropriate autopilot method based on command
- [x] Handle invalid commands gracefully
