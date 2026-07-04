# QA Setup Changes

Records what the QA gate baked into this template does, and why the numbers are what they are.

## Coverage thresholds are a floor

These coverage numbers are the minimum for the scaffold. In your real project, raise them as you add tested features following the template's patterns — never lower them. Example modules (todo/notes) are excluded from coverage because you'll replace them.

| Package | Lines | Functions | Branches | Statements |
|---|---|---|---|---|
| `apps/web` | 60 | 60 | 50 | 60 |
| `packages/contracts` | 90 | 90 | 85 | 90 |
| `apps/backend` | 25 | 20 | 20 | 25 |
| `packages/auth` | 80 | 80 | 30 | 80 |
| `packages/db` | no tests yet — `test:cov` is a no-op |

## Excluded example/demo code

Coverage-excluded because it's disposable scaffold code, not a reusable pattern:

- `apps/backend`: `modules/v1/examples/` (jest `coveragePathIgnorePatterns`)
- `packages/contracts`: `**/modules/v1/examples/**` (vitest `coverage.exclude`)
- `apps/web`: `**/features/todos/**` (vitest `coverage.exclude`)
