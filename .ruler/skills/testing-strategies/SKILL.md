---
name: testing-strategies
description: Testing patterns for this Turborepo monorepo. Use when writing unit tests, E2E tests, creating test data factories, mocking dependencies, or configuring Jest. Triggers on tasks involving test files, spec files, coverage, assertions, test utilities, or test configuration.
frameworks:
  - jest
  - nestjs
  - supertest
  - vitest
  - playwright
languages:
  - typescript
category: testing
updated: 2026-08-15
---

# Testing Strategies

## Quick Reference

| Layer | Framework | Config | Command |
|-------|-----------|--------|---------|
| Backend unit | Jest + ts-jest | `apps/backend/package.json` (jest key) | `pnpm --filter @repo/backend test` |
| Backend E2E | Jest (ESM) + supertest | `apps/backend/test/jest-e2e.json` | `pnpm --filter @repo/backend test:e2e` |
| Backend coverage | Jest | — | `pnpm --filter @repo/backend test:cov` |
| Web / contracts / auth unit | Vitest | root `vitest.config.ts` (projects) | `pnpm test` / `pnpm test:cov` |
| Web E2E | Playwright (`@repo/e2e-web`) | `packages/e2e-web/playwright.config.ts` | `pnpm test:e2e:web` |
| Mobile | flutter_test | `apps/mobile/test/` | `flutter test` |

Web, contracts, and auth testing is **live**, not future. The root `vitest.config.ts` orchestrates three projects — `apps/web`, `packages/contracts`, `packages/auth` — and `pnpm test` / `pnpm test:cov` fan out through Turbo. `packages/db` and `packages/observability` each have their **own standalone `vitest.config.ts`** (not registered in the root projects) that Turbo runs via their per-package `test`/`test:cov` scripts. `@repo/e2e-web` holds the Playwright suite (`pnpm test:e2e:web`, report via `pnpm show-report:e2e:web`).

The CI quality gate enforces `test:cov` (unit) plus Playwright e2e — see the `ci-cd-pipelines` skill. Coverage floors below are enforced there.

## Backend Unit Testing

### File Location & Naming

Unit test files live next to the source file:
```
modules/v1/examples/todos/
├── todos.controller.ts
├── todos.controller.spec.ts    ← unit test
├── todos.service.ts
└── todos.service.spec.ts       ← unit test
```

### Jest Configuration (from package.json)

```json
{
  "jest": {
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": ["ts-jest", { "tsconfig": "tsconfig.spec.json" }]
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "coverageThreshold": {
      "global": { "lines": 25, "functions": 20, "branches": 20, "statements": 25 }
    },
    "coveragePathIgnorePatterns": ["<rootDir>/modules/v1/examples/"],
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^@repo/db/(.*)$": "<rootDir>/../../../packages/db/src/$1",
      "^@repo/auth/(.*)$": "<rootDir>/../../../packages/auth/src/$1",
      "^@repo/contracts$": "<rootDir>/../../../packages/contracts/src",
      "^@repo/observability$": "<rootDir>/../../../packages/observability/src/index.ts",
      "^@/(.*)$": "<rootDir>/$1",
      "^(\\.{1,2}/.*)\\.js$": "$1"
    },
    "setupFiles": ["<rootDir>/../jest.setup.ts"]
  }
}
```

Key points:
- `moduleNameMapper` maps `@/` to `src/`, resolves the `@repo/*` workspace packages (including `@repo/observability`) to their `src`, and strips the `.js` extension ESM specifiers carry.
- `coveragePathIgnorePatterns` excludes the disposable `modules/v1/examples/` scaffold from coverage.
- `setupFiles` loads `../jest.setup.ts`.

### Test Data Factory Pattern

Create reusable factory functions for test data:

```typescript
import type { V1Outputs } from "@/config/contract-types"

type TodoOutput = V1Outputs["example"]["todo"]["get"]

function createMockTodo(overrides?: Partial<TodoOutput>): TodoOutput {
  return {
    id: 1,
    title: "Test Todo",
    completed: false,
    authorId: "user-123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}
```

**Rules:**
- Use `V1Outputs` from contract types for type-safe test data
- Accept `Partial<T>` overrides for flexible customization
- Provide sensible defaults for all fields

### Mocking Drizzle DB Chains

The most common mock pattern — chaining `.select().from().where()`:

```typescript
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

// Helper: mock select chain
function setupSelectMock(returnValue: unknown) {
  const whereFn = jest.fn().mockResolvedValue(returnValue)
  const fromFn = jest.fn().mockReturnValue({ where: whereFn })
  mockDb.select.mockReturnValue({ from: fromFn })
  return { fromFn, whereFn }
}

// Helper: mock insert chain
function setupInsertMock(returnValue: unknown) {
  const returningFn = jest.fn().mockResolvedValue(returnValue)
  const valuesFn = jest.fn().mockReturnValue({ returning: returningFn })
  mockDb.insert.mockReturnValue({ values: valuesFn })
  return { valuesFn, returningFn }
}

// Helper: mock update chain
function setupUpdateMock(returnValue: unknown) {
  const returningFn = jest.fn().mockResolvedValue(returnValue)
  const whereFn = jest.fn().mockReturnValue({ returning: returningFn })
  const setFn = jest.fn().mockReturnValue({ where: whereFn })
  mockDb.update.mockReturnValue({ set: setFn })
  return { setFn, whereFn, returningFn }
}

// Helper: mock delete chain
function setupDeleteMock(returnValue: unknown) {
  const returningFn = jest.fn().mockResolvedValue(returnValue)
  const whereFn = jest.fn().mockReturnValue({ returning: returningFn })
  mockDb.delete.mockReturnValue({ where: whereFn })
  return { whereFn, returningFn }
}
```

### Controller Unit Test Pattern

```typescript
import { Test, TestingModule } from "@nestjs/testing"
import { DB } from "@/common/database/database-providers"
import { TodosService } from "./todos.service"

// Mock external modules
jest.mock("@repo/db/schema", () => ({
  todos: { id: "id", title: "title", completed: "completed", authorId: "authorId" },
}))

describe("TodosService", () => {
  let service: TodosService
  const mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodosService,
        { provide: DB, useValue: mockDb },
      ],
    }).compile()

    service = module.get<TodosService>(TodosService)
    jest.clearAllMocks()
  })

  describe("findAll", () => {
    it("should return all todos", async () => {
      const mockTodos = [createMockTodo(), createMockTodo({ id: 2, title: "Second" })]
      setupSelectMock(mockTodos)

      const result = await service.findAll()

      expect(result).toEqual(mockTodos)
      expect(mockDb.select).toHaveBeenCalled()
    })
  })

  describe("create", () => {
    it("should create and return a todo", async () => {
      const newTodo = createMockTodo()
      setupInsertMock([newTodo])

      const result = await service.create({
        payload: { title: "Test Todo", completed: false },
        authorId: "user-123",
      })

      expect(result).toEqual(newTodo)
    })
  })
})
```

### Mocking Decorators and Auth

```typescript
// Mock @Session() decorator
jest.mock("@thallesp/nestjs-better-auth", () => ({
  Session: () => () => {},         // No-op decorator
  AuthModule: { forRoot: () => ({ module: class {} }) },
}))

// Mock auth guard
jest.mock("@/shared/guards/auth.guard", () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}))
```

### Mocking the Redis-backed Throttler

`AppModule` wires `ThrottlerModule` to `@nest-lab/throttler-storage-redis` (backed by `ioredis`) and injects `REDIS_CLIENT`. Booting `AppModule` in a test without a Redis connection will try to connect, so either override the Redis provider / storage or mock the modules:

```typescript
jest.mock("@nest-lab/throttler-storage-redis", () => ({
  ThrottlerStorageRedisService: jest.fn().mockImplementation(() => ({})),
}))
jest.mock("ioredis", () => jest.fn().mockImplementation(() => ({ on: jest.fn(), quit: jest.fn() })))
```

The throttler degrades fail-open (no Redis → in-memory), so unit tests of a single service usually just provide the service under test and skip the module entirely.

## Backend E2E Testing

### Configuration (`test/jest-e2e.json`) — ESM

E2E runs under Node's ESM VM loader. The runner is `cross-env NODE_OPTIONS=--experimental-vm-modules jest --config ./test/jest-e2e.json`.

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": ["ts-jest", { "tsconfig": "<rootDir>/../tsconfig.spec.json", "useESM": true }]
  },
  "extensionsToTreatAsEsm": [".ts"],
  "moduleNameMapper": {
    "^@repo/db$": "<rootDir>/../../../packages/db/src",
    "^@repo/db/(.*)$": "<rootDir>/../../../packages/db/src/$1",
    "^@repo/auth/(.*)$": "<rootDir>/../../../packages/auth/src/$1",
    "^@repo/contracts$": "<rootDir>/../../../packages/contracts/src",
    "^@repo/observability$": "<rootDir>/../../../packages/observability/src/index.ts",
    "^@/(.*)$": "<rootDir>/../src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  "setupFiles": ["<rootDir>/setup-env.ts"]
}
```

`useESM: true` + `extensionsToTreatAsEsm: [".ts"]` + the `--experimental-vm-modules` node flag are what make the ESM workspace packages import correctly; `setup-env.ts` seeds the test environment.

### E2E Test Pattern (Full CRUD Cycle)

```typescript
import { Test, TestingModule } from "@nestjs/testing"
import { INestApplication, ValidationPipe, VersioningType } from "@nestjs/common"
import * as request from "supertest"
import { AppModule } from "../src/app.module"

describe("TodosController (e2e)", () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix("api")
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" })
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it("CRUD workflow", async () => {
    // List
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/examples/todos")
      .expect(200)
    expect(Array.isArray(listRes.body)).toBe(true)

    // Create
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/examples/todos")
      .send({ title: "E2E Todo", completed: false })
      .expect(201)
    expect(createRes.body.title).toBe("E2E Todo")
    const todoId = createRes.body.id

    // Update
    await request(app.getHttpServer())
      .put(`/api/v1/examples/todos/${todoId}`)
      .send({ title: "Updated E2E Todo", completed: true })
      .expect(200)

    // Delete
    await request(app.getHttpServer())
      .delete(`/api/v1/examples/todos/${todoId}`)
      .expect(200)
  })
})
```

**Key patterns:**
- Mirror the same global configuration as `bootstrap.ts` (prefix, versioning, pipes)
- Use `beforeAll`/`afterAll` for app lifecycle (not `beforeEach` — too slow)
- Test full CRUD cycles in sequence for integration coverage

### Mocking DB in E2E

Override the DB provider for isolated E2E tests:

```typescript
const moduleFixture = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(DB)
  .useValue({
    execute: jest.fn().mockResolvedValue([{ status: "ok" }]),
  })
  .compile()
```

## Test Commands

```bash
# Unit tests
pnpm --filter @repo/backend test

# Unit tests in watch mode
pnpm --filter @repo/backend test:watch

# E2E tests
pnpm --filter @repo/backend test:e2e

# Coverage report
pnpm --filter @repo/backend test:cov

# Debug tests (attach Node inspector)
pnpm --filter @repo/backend test:debug

# Run specific test file
pnpm --filter @repo/backend test -- --testPathPattern=todos.service.spec
```

## Test Organization Rules

1. **Unit tests** (`*.spec.ts`) — next to the file being tested
2. **E2E tests** (`*.e2e-spec.ts`) — in `apps/backend/test/`
3. **Test data factories** — defined in the same spec file or a shared `test/utils/` directory
4. **Mock helpers** — defined at the top of the spec file (per-file scope)
5. **No test barrel files** — import directly from test utilities

## Coverage Floors (enforced, per package)

These are the scaffold's minimums — a floor to raise as you add tested features, never lower (see `docs/QA-SETUP-CHANGES.md`). Example/demo modules are coverage-excluded because you replace them.

| Package | Lines | Functions | Branches | Statements |
|---|---|---|---|---|
| `apps/backend` | 25 | 20 | 20 | 25 |
| `apps/web` | 60 | 60 | 50 | 60 |
| `packages/contracts` | 90 | 90 | 85 | 90 |
| `packages/auth` | 80 | 80 | 30 | 80 |
| `packages/db` | has `src/seed-guard.spec.ts` + a standalone `vitest.config.ts` (coverage covers `src/seed-guard.ts`, `src/utils/**`); real `test`/`test:cov` scripts |
| `packages/observability` | has `src/redaction.spec.ts` + a standalone `vitest.config.ts`; real `test`/`test:cov` scripts |

Coverage exclusions: backend `modules/v1/examples/` (jest `coveragePathIgnorePatterns`); contracts `**/modules/v1/examples/**` and web `**/features/todos/**` (vitest `coverage.exclude`).

## Writing Good Tests

- **Name tests descriptively**: `"should return 404 when todo not found"` not `"test error"`
- **One assertion per behavior**: Test one logical outcome per `it()` block
- **Use factory functions**: Never hardcode test data inline
- **Mock at boundaries**: Mock DB, external APIs, not internal functions
- **Test error paths**: Include tests for validation errors, not-found, unauthorized
- **Clean up**: Always close app in `afterAll`/`afterEach`
