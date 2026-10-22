# Tracked upgrades

Deferred dependency work. Each entry names the risk of leaving it, so the
decision to defer stays reviewable rather than becoming a silent default.

## drizzle-orm / drizzle-kit 1.0

**Status:** still tracked. The pins moved from `1.0.0-beta.9-e89174b` to
`1.0.0-beta.20`. Stable 1.0 (and the `rc` line the beta packages advertise) is
not this change.

**Current pins**

| Package | Pin | Where |
| --- | --- | --- |
| `drizzle-orm` | `catalog:` → `1.0.0-beta.20` | `pnpm-workspace.yaml` |
| `drizzle-kit` | `1.0.0-beta.20` | `packages/db/package.json` |

Both pins are exact. A `^` on a beta lets the next pre-release change query
behaviour without a review.

**One-time migrations-table upgrade (beta.16+, included in beta.20).**
`drizzle-kit migrate` keeps history in `drizzle.__drizzle_migrations`.
beta.9 wrote three columns: `id`, `hash`, `created_at`. The first
`drizzle-kit migrate` on beta.20 against that table alters it in place. It
adds `name` (text, nullable) and `applied_at` (timestamptz, nullable),
backfills `name` from the migration folder (`20260608075354_baseline`, and so
on), and leaves `applied_at` null on those existing rows. `id`, `hash`, and
`created_at` are unchanged, and no migration SQL is applied again. A database
that has never been migrated gets the five-column table immediately, with
`applied_at` set on each row it applies. There is no `version` column.
CI seeds with `pnpm db:seed`, which runs `drizzle-kit push` and does not take
this path. Deployed apps that run `drizzle-kit migrate` do. Expect that one
alter on the first migrate after this pin. Do not hand-write a migration for
the bookkeeping table.

**Do this when stable 1.0 ships**

1. Read the 1.0 migration notes end to end before changing a version number.
2. Bump `drizzle-orm` in the workspace catalog and `drizzle-kit` in
   `packages/db/package.json` together — they must stay on one line.
3. Regenerate migrations and diff the SQL. A generator change that rewrites
   existing migrations is the failure mode to look for.
4. Run the full backend suite plus a real `pnpm db:push` against a scratch
   database, and run `drizzle-kit migrate` once against a database that already
   has the beta.20 bookkeeping table.
