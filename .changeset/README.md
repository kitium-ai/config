# Changesets

Changesets are a way to manage versioning and changelogs for this package.

## Adding a changeset

To add a changeset, run:

```bash
pnpm changeset
```

This will prompt you to:

1. Select which packages to include (only `@kitiumai/config` in this case)
2. Choose the version bump type (major, minor, or patch)
3. Write a summary of the changes

## Releasing

When you're ready to release:

1. **Version the package**: `pnpm changeset version`
   - This updates the version in `package.json`
   - Generates/updates `CHANGELOG.md`

2. **Publish to npm**: `pnpm changeset publish`
   - This publishes the package to npm
   - Requires `NPM_TOKEN` environment variable

Or use the automated workflow scripts:

- `pnpm release` - Version and prepare for release
- `pnpm publish:package` - Publish to npm
