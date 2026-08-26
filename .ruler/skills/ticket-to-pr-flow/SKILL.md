---
name: ticket-to-pr-flow
description: Turning docs/TICKETS.md entries into tracked issues and auto-drafted pull requests, via either GitHub Issues or Linear. Use when importing tickets, setting up the PR-bot GitHub App, or wiring the auto-draft-PR workflows. Triggers on tickets, TICKETS.md, Linear, GitHub Issues, draft PR, tickets-to-issues, tickets-to-linear.
category: workflow
updated: 2026-08-15
---

# Ticket → PR Flow

Two parallel flows, one shared source file. Pick GitHub Issues **or** Linear; both import from the same `docs/TICKETS.md` and both end by auto-drafting a PR to `dev` on first push of a matching branch.

## Shared ticket format (`docs/TICKETS.md`)

Blocks are separated by `---`. A ticket block is parsed by both scripts identically:

```markdown
**Title:** [KEY] Short imperative name
**Epic:** `epic-key`
**Also touches:** `other-area` `another-area`
...body...
```

- `**Title:** [KEY] …` is required (regex `\[([A-Z0-9-]+)\]\s+(.+)`). KEY becomes the issue key.
- Labels applied = `ticket` + the epic + each "Also touches" area. Issue/description title = `[KEY] Title`; body/description is prefixed `> Generated from docs/TICKETS.md`.
- Both scripts are **idempotent**: they skip a ticket whose `[KEY] Title` already exists.

## Flow A — GitHub Issues (`scripts/tickets-to-issues.mjs`)

```bash
node scripts/tickets-to-issues.mjs docs/TICKETS.md \
  --project <number> --project-owner <owner> --repo <owner/name> [--dry-run]
```

- Uses the `gh` CLI. `--project` + `--project-owner` are required; creates labels (`--color 0075ca --force`), creates each issue (`gh issue create`), and adds it to the GitHub Project (`gh project item-add`; needs `gh auth refresh -s project` once).
- Per-ticket next step it prints: `gh issue develop <n> --base dev --checkout` → branch named `<n>-…` → `git push -u origin HEAD`.
- **Workflow `auto-draft-pr.yml`** fires on push to `[0-9]+-**` branches: derives the leading issue number, opens a draft PR to `dev` with body **`Closes #<n>`** (so merge closes the issue).

## Flow B — Linear (`scripts/tickets-to-linear.mjs`)

```bash
LINEAR_API_KEY=lin_api_xxx node scripts/tickets-to-linear.mjs docs/TICKETS.md \
  --team <TEAM_KEY> [--dry-run] [--state <name>]
```

- Talks to the Linear GraphQL API with `LINEAR_API_KEY` (a Personal API key). `--team` is required; resolves the team, ensures labels exist (`color #0075ca`), and creates issues in the team's **Triage** state by default (`--state` overrides).
- Prints Linear's own branch name (e.g. `bid-4-add-vendor-parsing`) plus `git checkout -b … && git push -u origin HEAD`.
- **Workflow `auto-draft-pr-linear.yml`** fires on push to `*-[0-9]+-**` (and prefixed `**/*-[0-9]+-**`) branches: derives the Linear ID (`bid-4-…` → `BID-4`) and a title, opens a draft PR to `dev` with body **`Part of BID-4`**. Linear links the PR from the branch name automatically; merging moves the issue to In QA / Done.

## Shared PR-bot GitHub App

Both workflows mint a token with `actions/create-github-app-token` and default `permissions: contents: read` (the App token carries the real grants):

| Kind | Name | Value |
|---|---|---|
| Variable | `PR_BOT_APP_ID` | the GitHub App ID |
| Secret | `PR_BOT_APP_PRIVATE_KEY` | the full private-key PEM |

App permissions:
- GitHub flow: **contents: write + pull-requests: write + issues: write**.
- Linear flow: **contents: write + pull-requests: write** only — issues live in Linear, so `issues` is NOT needed.

Both workflows check for an existing open PR on the head branch first, so re-pushing never opens duplicates.

## Notes

- Use `--dry-run` first; it lists the labels and issues it would create without writing.
- The date-tagged release notes (`release-changelog.yml`) group merged PRs by their epic label — the same labels these scripts apply. See `ci-cd-pipelines`.
- README sections: "From tickets to pull requests (GitHub Issues)" and "(Linear)".
