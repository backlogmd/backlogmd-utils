# Implement URL detection

- **Status:** done
- **Priority:** 010
- **Owner:** —
- **Item:** [BacklogMD parser emits JSON](../../backlog.md#001---backlogmd-parser-emits-json)
- **Depends on:** [009](009-add-fetch-capability.md)

## Description

Add logic to distinguish between local file paths and remote URLs.

## Acceptance Criteria

- [ ] Detect http:// and https:// prefixes
- [ ] Validate URL format before attempting fetch
- [ ] Create utility function for URL vs path detection
