<!-- METADATA -->

```yaml
t: Test /work and /plan commands
s: done
p: 20
dep: ["001"]
a: ""
h: false
expiresAt: null
```

<!-- DESCRIPTION -->

## Description

Test the chat commands implementation to ensure:

- `/work <taskId>` executes the correct task
- `/plan <taskId>` executes the correct plan task
- Direct prompts work as before

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Verify /work command executes task by ID (without status change)
- [x] Verify /task command executes task by ID (with status change)
- [x] Verify /plan command executes plan task by ID
- [x] Verify direct prompts still work without command prefix
- [x] Test error handling for invalid task IDs
