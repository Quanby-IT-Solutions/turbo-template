# Critical User Journeys

Rule of thumb: if this flow broke in production, would it be an emergency?

| # | Journey | Why critical | E2E spec | Covered? |
|---|---|---|---|---|
| 1 | User can log in | No login = no access to the product at all | `auth.spec.ts` | Yes |
| 2 | Authenticated user reaches home | Confirms session + auth shell work end to end | `authenticated.spec.ts` | Yes |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

## Not critical (cover elsewhere)

Flows that matter but don't need E2E-level guarantees — cover with unit/integration tests instead.
