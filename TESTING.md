# Testing Guide

A complete reference for the three-tier testing strategy in this monorepo: **unit tests** (Vitest), **component tests** (React Testing Library), and **end-to-end tests** (Playwright).

---

## Table of Contents

1. [Overview](#overview)
2. [Running Tests](#running-tests)
3. [Unit & Component Tests (Vitest)](#unit--component-tests-vitest)
4. [E2E Tests (Playwright)](#e2e-tests-playwright)
5. [Coverage](#coverage)
6. [Writing Tests](#writing-tests)
7. [Pre-Push Hook](#pre-push-hook)
8. [CI Pipeline](#ci-pipeline)
9. [Coverage Thresholds](#coverage-thresholds)

---

## Overview

| Layer | Tool | Packages | Environment |
|-------|------|----------|-------------|
| Unit / Component | Vitest + React Testing Library | `apps/web`, `packages/contracts` | jsdom / node |
| E2E | Playwright | `packages/e2e-web` | Chromium (headless) |

The root `vitest.config.ts` aggregates both package configs into a single workspace:

```
vitest.config.ts          ← root workspace entry
├── apps/web/vitest.config.ts
└── packages/contracts/vitest.config.ts
```

---

## Running Tests

### All tests at once

```bash
# Run all unit tests across all packages
pnpm test

# Run all unit tests with coverage
pnpm test:cov

# Run only E2E tests (web app must be running or built)
pnpm test:e2e:web
```

### Per-package

```bash
# Unit tests — watch mode (development)
pnpm --filter @repo/web test:watch
pnpm --filter @repo/contracts test:watch

# Unit tests — single run
pnpm --filter @repo/web test
pnpm --filter @repo/contracts test

# Unit tests — single run with coverage
pnpm --filter @repo/web test:cov
pnpm --filter @repo/contracts test:cov
```

### Affected only (Turborepo)

Runs tests only for packages changed since the last commit. Used by the pre-push hook and CI PRs.

```bash
pnpm turbo test --affected
pnpm turbo test:cov --affected
```

---

## Unit & Component Tests (Vitest)

### `apps/web`

- **Environment**: `jsdom` (browser-like DOM)
- **Setup file**: `apps/web/vitest.setup.ts` — imports `@testing-library/jest-dom` and stubs required env vars
- **Globals**: enabled (`describe`, `it`, `expect`, etc. are available without imports)
- **Path alias**: `@` → root of `apps/web`

Test files live next to the code they test:

```
apps/web/
├── core/
│   ├── hooks/
│   │   ├── use-mobile.ts
│   │   └── use-mobile.test.ts        ← hook test
│   └── lib/
│       ├── date-transform.ts
│       └── date-transform.test.ts    ← utility test
└── features/
    └── auth/
        └── components/
            ├── password-input.tsx
            └── password-input.test.tsx  ← component test
```

#### Hook test example

```typescript
// core/hooks/use-mobile.test.ts
import { renderHook, act } from "@testing-library/react"
import { useIsMobile } from "./use-mobile"

describe("useIsMobile", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    })
  })

  it("returns false when viewport is desktop width", () => {
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("returns true when viewport is mobile width", () => {
    Object.defineProperty(window, "innerWidth", { value: 375 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })
})
```

#### Component test example

```typescript
// features/auth/components/password-input.test.tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PasswordInput } from "./password-input"

describe("PasswordInput", () => {
  it("renders as password type by default", () => {
    render(<PasswordInput />)
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "password")
  })

  it("toggles visibility when button is clicked", async () => {
    render(<PasswordInput />)
    await userEvent.click(screen.getByRole("button", { name: /show/i }))
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text")
  })
})
```

---

### `packages/contracts`

- **Environment**: `node`
- **Globals**: enabled
- **Path alias**: `@` → `packages/contracts/src`

Schema tests live next to the contract file they validate:

```
packages/contracts/src/modules/v1/examples/todos/
├── todos.contract.ts
└── todos.schema.test.ts
```

#### Schema test example

```typescript
// todos.schema.test.ts
import { TodoSchema, CreateTodoSchema, TodoIdSchema } from "./todos.contract"

describe("TodoSchema", () => {
  it("accepts a valid todo", () => {
    const result = TodoSchema.safeParse({
      id: 1,
      title: "Buy milk",
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(true)
  })

  it("rejects a todo with an empty title", () => {
    const result = TodoSchema.safeParse({ id: 1, title: "" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain("title")
  })
})

describe("TodoIdSchema", () => {
  it("rejects zero", () => {
    const result = TodoIdSchema.safeParse(0)
    expect(result.success).toBe(false)
  })
})
```

---

## E2E Tests (Playwright)

### Setup

```bash
# Install Playwright browsers (first time or after updates)
cd packages/e2e-web
npx playwright install chromium --with-deps
```

### Running

The web app must be running before E2E tests execute.

```bash
# Terminal 1 — start the web app
pnpm dev:web

# Terminal 2 — run E2E tests
pnpm test:e2e:web
```

To target a different URL:

```bash
BASE_URL=https://staging.example.com pnpm test:e2e:web
```

### Configuration

**`packages/e2e-web/playwright.config.ts`**

| Setting | Local | CI |
|---------|-------|----|
| Retries | 0 | 2 |
| Workers | CPU-based | 1 (serial) |
| Reporter | HTML | Blob |
| Base URL | `http://localhost:3001` | `$BASE_URL` |
| Screenshots | On failure | On failure |
| Trace | On first retry | On first retry |

### Writing E2E tests

Add files to `packages/e2e-web/tests/`:

```typescript
// packages/e2e-web/tests/todos.spec.ts
import { test, expect } from "@playwright/test"

test.describe("Todos page", () => {
  test("displays empty state when no todos exist", async ({ page }) => {
    await page.goto("/todos")
    await expect(page.getByText("No todos yet")).toBeVisible()
  })

  test("creates a new todo", async ({ page }) => {
    await page.goto("/todos")
    await page.getByPlaceholder("Add a todo").fill("Buy milk")
    await page.getByRole("button", { name: "Add" }).click()
    await expect(page.getByText("Buy milk")).toBeVisible()
  })
})
```

### View the HTML report

```bash
cd packages/e2e-web
npx playwright show-report
```

---

## Coverage

### Generating coverage reports

```bash
# Generate coverage for all packages
pnpm test:cov

# Generate coverage for a specific package
pnpm --filter @repo/web test:cov
pnpm --filter @repo/contracts test:cov
```

### Report locations

| Package | HTML report | JSON summary |
|---------|-------------|--------------|
| `apps/web` | `apps/web/coverage/index.html` | `apps/web/coverage/coverage-summary.json` |
| `packages/contracts` | `packages/contracts/coverage/index.html` | `packages/contracts/coverage/coverage-summary.json` |

Open the HTML report in a browser for line-by-line coverage:

```bash
# macOS / Linux
open apps/web/coverage/index.html

# Windows
start apps/web/coverage/index.html
```

### Coverage thresholds

Tests fail if coverage drops below these thresholds:

| Package | Lines | Functions | Branches | Statements |
|---------|-------|-----------|----------|------------|
| `apps/web` | 60% | 60% | 50% | 60% |
| `packages/contracts` | 90% | 90% | 85% | 90% |

`packages/contracts` has stricter thresholds because it defines the API contract boundary — schema regressions have wider blast radius.

---

## Writing Tests

### File naming

| Type | Pattern | Example |
|------|---------|---------|
| Unit / hook | `*.test.ts` | `use-auth.test.ts` |
| Component | `*.test.tsx` | `todo-card.test.tsx` |
| Schema | `*.test.ts` | `todos.schema.test.ts` |
| E2E | `*.spec.ts` | `checkout.spec.ts` |

### Co-location rule

Test files live **next to the file they test** — not in a separate `__tests__` directory.

```
# Correct
features/todos/components/todo-card.tsx
features/todos/components/todo-card.test.tsx

# Wrong
features/todos/__tests__/todo-card.test.tsx
```

### Mocking

#### Environment variables

Already handled by `vitest.setup.ts` for the common vars. For additional vars in a specific test:

```typescript
beforeEach(() => {
  process.env.MY_VAR = "test-value"
})

afterEach(() => {
  delete process.env.MY_VAR
})
```

#### Browser APIs (jsdom limitations)

```typescript
// Mock matchMedia (not available in jsdom)
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
})
```

#### Modules

```typescript
vi.mock("@/services/orpc/client", () => ({
  orpc: {
    example: {
      todo: {
        list: { queryOptions: vi.fn(() => ({ queryKey: ["todos"], queryFn: vi.fn() })) },
      },
    },
  },
}))
```

### Testing async components

```typescript
import { render, screen, waitFor } from "@testing-library/react"

it("loads and displays todos", async () => {
  render(<TodoList />)
  await waitFor(() => {
    expect(screen.getByText("Buy milk")).toBeInTheDocument()
  })
})
```

---

## Pre-Push Hook

A Husky hook runs before every `git push` to catch regressions before they reach remote:

```bash
# .husky/pre-push
turbo test --affected
```

This runs tests only for packages affected by your changes — fast for small PRs, full suite when needed. The push is blocked if any test fails.

To skip in an emergency (not recommended):

```bash
git push --no-verify
```

---

## CI Pipeline

Three jobs run on every push to `dev`/`staging`/`production` and on all pull requests.

### Job 1 — Lint and Typecheck

```
pnpm typecheck
pnpm lint
pnpm format
```

### Job 2 — Unit Tests

| Trigger | Command |
|---------|---------|
| Pull request | `pnpm turbo test:cov --affected` |
| Branch push | `pnpm turbo test:cov` (full suite) |

On pull requests, the job also:
- Posts per-file coverage annotations via `davelosert/vitest-coverage-report-action` (only when coverage files exist)
- Leaves a sticky PR comment with actual coverage percentages and pass/fail status

### Job 3 — E2E Tests

| Trigger | Behavior |
|---------|----------|
| Push to `staging` or `production` | Always runs |
| Push to `dev` | Always runs |
| Pull request | Only runs if `apps/web/**`, `packages/contracts/**`, `packages/auth/**`, `packages/db/**`, or `packages/e2e-web/**` changed |
| `workflow_dispatch` | Always runs |

On failure, the Playwright HTML report is uploaded as a GitHub Actions artifact (retained 7 days).

### Deploy gate

The `deploy.yml` workflow only triggers after CI passes (`workflow_run: [completed]`), and only proceeds when `conclusion == 'success'`. A failing test job blocks deployment.

---

## Quick Reference

```bash
# Development — watch mode
pnpm --filter @repo/web test:watch

# Before committing — affected tests only
pnpm turbo test --affected

# Full suite with coverage
pnpm test:cov

# E2E (requires running app)
pnpm dev:web &
pnpm test:e2e:web

# View coverage report
open apps/web/coverage/index.html
open packages/contracts/coverage/index.html
```
