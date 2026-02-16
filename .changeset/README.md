# Changesets

When you make a change that should be released, add a changeset:

```bash
npm run changeset
```

- Choose the package(s) you changed
- Pick the bump type: patch, minor, or major
- Write a short summary (will appear in CHANGELOG)

Commit the new file under `.changeset/` with your PR. When the release is done, these files are consumed and removed.

**Releasing:**

1. **Version** (update package.json and CHANGELOGs):  
   `npm run version`
2. Commit the version bumps.
3. **Publish** (build and publish to npm):  
   `npm run release`  
   Or let CI publish when you create a GitHub Release.
