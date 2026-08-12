# Tracked upgrades

Deferred dependency work. Each entry names the risk of leaving it, so the
decision to defer stays reviewable rather than becoming a silent default.

## drizzle-orm / drizzle-kit 1.0 (HY-2 / F-53)

**Status:** tracked, not scheduled. No code change in HY-2.

**Current pins**

| Package | Pin | Where |
| --- | --- | --- |
| `drizzle-orm` | `catalog:` → `1.0.0-beta.9-e89174b` | `pnpm-workspace.yaml` |
| `drizzle-kit` | `1.0.0-beta.9-e89174b` | `packages/db/package.json` |

**Why this is worth tracking:** both are pre-release builds pinned to a commit
hash, and `drizzle-orm` is a production runtime dependency — every query the
backend runs goes through it. A beta carries no stability guarantee: the
release-candidate line can change query-builder behaviour or type inference
between builds, and there is no deprecation window to catch it in. The exact
pin is what makes this tolerable today; it means the build is reproducible and
cannot drift into a different beta on its own.

**Why it was not upgraded here:** 1.0 is not released. The upgrade is a real
migration (relations API and the `drizzle-kit` config surface both changed
across the beta line), it touches every query in the backend, and doing it
inside a hygiene batch would put an untested ORM swap in a commit whose other
six changes are one-liners.

**Do this when 1.0 ships**

1. Read the 1.0 migration notes end to end before changing a version number.
2. Bump `drizzle-orm` in the workspace catalog and `drizzle-kit` in
   `packages/db/package.json` together — they must stay on one line.
3. Regenerate migrations and diff the SQL. A generator change that rewrites
   existing migrations is the failure mode to look for.
4. Run the full backend suite plus a real `pnpm db:push` against a scratch
   database.

**Until then:** do not float either pin to a range. A `^` on a beta is the
specific thing that turns this from tracked risk into an outage.
