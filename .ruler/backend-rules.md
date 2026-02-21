---
description: NestJS backend conventions for apps/backend
globs: ["apps/backend/**/*.ts"]
alwaysApply: false
---

# NestJS Backend Rules (`apps/backend/`)

## Directory Organization

```
apps/backend/src/
├── bootstrap.ts             # App creation and startup orchestrator
├── main.ts                  # Entry point
├── app.module.ts            # Root module
├── common/                  # Reusable NestJS modules used across features
│   ├── database/            # Database module, providers, connection
│   ├── decorators/          # Custom decorators
│   ├── filters/             # Global exception filters
│   └── orpc/                # oRPC integration module
├── config/                  # App configuration
│   ├── api-versions.config.ts  # Version registry and contract re-exports
│   ├── app.config.ts           # CORS, body parser, graceful shutdown
│   ├── auth.config.ts          # Better Auth middleware and routes
│   ├── env.config.ts           # Environment validation
│   └── swagger.config.ts       # OpenAPI doc generation (Scalar)
├── modules/                 # Feature modules organized by API version
│   └── v1/
│       ├── v1.module.ts
│       └── [feature]/
│           ├── [feature].module.ts
│           ├── [feature].controller.ts
│           ├── [feature].service.ts
│           ├── [feature].controller.spec.ts
│           └── [sub-feature]/
├── shared/                  # Shared non-module code
│   ├── decorators/          # Custom decorators
│   ├── guards/              # Auth guards, role guards
│   ├── interceptors/        # Logging, transform interceptors
│   └── pipes/               # Validation pipes
├── utils/                   # Pure utility functions (no NestJS dependencies)
└── main.module.ts           # Root module (deprecated, use app.module.ts)
```

## Folder Purposes

| Folder     | Purpose                                      | Example Contents                          |
| ---------- | -------------------------------------------- | ----------------------------------------- |
| `common/`  | NestJS modules imported by multiple features | `DBModule`, `HealthModule`, `CacheModule` |
| `config/`  | Environment and app configuration            | Env validation, versioning, auth, swagger |
| `modules/` | Business feature modules, versioned          | `v1/users/`, `v1/todos/`                  |
| `shared/`  | Reusable NestJS building blocks              | Decorators, guards, interceptors, pipes   |
| `utils/`   | Pure utility functions                       | String helpers, date formatting           |

### Key Distinctions

- **`common/`** = Full NestJS modules (things you `@Module({ imports: [...] })`)
- **`shared/`** = NestJS building blocks (decorators, guards, pipes - not full modules)
- **`utils/`** = Framework-agnostic helpers with no NestJS dependencies

## File Naming Conventions

- **Modules**: `[feature].module.ts`
- **Controllers**: `[feature].controller.ts`
- **Services**: `[feature].service.ts`
- **Tests**: `[feature].controller.spec.ts`, `[feature].service.spec.ts`
- **Guards**: `[name].guard.ts`
- **Decorators**: `[name].decorator.ts`
- **Interceptors**: `[name].interceptor.ts`
- **Pipes**: `[name].pipe.ts`
- **Filters**: `[name].filter.ts`

## Shared Package Integration

### Using `@repo/contracts` (oRPC Controller Pattern)

Controllers implement oRPC contracts using `@Implement` from `@orpc/nest` and `implement` from `@orpc/server`. The versioned contract is imported from `@/config/api-versions.config` (not directly from `@repo/contracts`).

`api-versions.config.ts` exports the versioned contract as a short alias:

```typescript
// config/api-versions.config.ts
import { v1Contract } from "@repo/contracts"

export { v1Contract as v1 }
```

**Controller pattern** — each method implements one contract procedure:

```typescript
import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { v1 } from "@/config/api-versions.config"

@Controller()
export class TodosController {
	constructor(private readonly todosService: TodosService) {}

	@Implement(v1.example.todo.list)
	async listTodos() {
		return implement(v1.example.todo.list).handler(async () => {
			return this.todosService.findAll()
		})
	}

	@Implement(v1.example.todo.create)
	async createTodo(@Session() session: UserSession) {
		return implement(v1.example.todo.create).handler(async ({ input }) => {
			return this.todosService.create({ payload: input, authorId: session.user.id })
		})
	}
}
```

**Service type inference** — use `V1Inputs` / `V1Outputs` from `@/config/contract-types` to type service method parameters without re-declaring schemas:

```typescript
// config/contract-types.ts
import type { InferContractRouterInputs, InferContractRouterOutputs } from "@orpc/contract"

import { type v1Contract } from "@repo/contracts"

export type V1Inputs = InferContractRouterInputs<typeof v1Contract>
export type V1Outputs = InferContractRouterOutputs<typeof v1Contract>
```

Usage in a service:

```typescript
// In service
type CreateTodoInput = V1Inputs["example"]["todo"]["create"]

async create({ payload, authorId }: { payload: CreateTodoInput; authorId: string }) {
	// payload is fully typed from the contract
}
```

### Using `@repo/db`

Access database schema from the db package:

```typescript
// In service
import { todos } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class TodosService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll() {
		return this.db.select().from(todos)
	}
}
```

## API Versioning

- All feature modules live under `modules/v1/`, `modules/v2/`, etc.
- API prefix: `/api/v1/`, `/api/v2/`
- Version is set in `bootstrap.ts` with `app.enableVersioning()`

## Module Structure Pattern

Each feature module should follow this pattern:

```typescript
// todos.module.ts
@Module({
	controllers: [TodosController],
	providers: [TodosService],
	exports: [TodosService], // Only if needed by other modules
})
export class TodosModule {}
```

## Testing

- Unit tests: `*.spec.ts` next to the file being tested
- E2E tests: `test/` directory at app root
- Use `@nestjs/testing` for test utilities

## Common Patterns

### Dependency Injection

```typescript
@Injectable()
export class MyService {
	constructor(
		@Inject(DB) private readonly db: DBType,
		private readonly configService: ConfigService
	) {}
}
```

### Global Providers (in main.module.ts)

```typescript
providers: [
	{ provide: APP_PIPE, useClass: ZodValidationPipe },
	{ provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
	{ provide: APP_FILTER, useClass: HttpExceptionFilter },
]
```
