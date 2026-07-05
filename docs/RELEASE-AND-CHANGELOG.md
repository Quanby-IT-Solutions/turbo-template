# Release & Changelog Automation

## Branch flow

`dev` → `staging` → `production`

Work merges into `dev`, promotes to `staging` for QA, then to `production` to ship.

## What happens on a `production` push

`.github/workflows/release-changelog.yml` runs automatically (or via manual `workflow_dispatch`) and:

1. Computes a date-based tag, e.g. `v2026.07.05`. If a release already happened that day, it suffixes `.2`, `.3`, etc. (`v2026.07.05.2`).
2. Generates a changelog from merged PR titles since the previous tag, grouped by each PR's epic label (falls back to "Other" if unlabeled).
3. Prepends the new section to `CHANGELOG.md` and commits it to `production`.
4. Tags the commit and pushes the tag.
5. Publishes a GitHub Release with the generated changelog as the release notes.

This runs alongside `deploy-production.yml`, which also triggers on push to `production`.

## Why date-based tags, not semver

These are internal apps, not published packages — there's no external consumer depending on semver contracts. A date tag (`v2026.07.05`) tells you exactly when a release shipped, which is more useful for internal ops/support than a semver bump.

## What developers need to do

Nothing special. No conventional commits required. Just keep PR titles meaningful — they're auto-filled from ticket titles and used verbatim in the changelog, so a clear title is a clear changelog entry.
