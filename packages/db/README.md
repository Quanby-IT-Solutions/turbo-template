# @repo/db

Drizzle ORM database package with schema definitions and client.

## Structure

```
packages/db/
├── src/
│   ├── client.ts         # Database client factory
│   ├── schema.ts         # Schema exports
│   └── utils/            # Database utilities
├── drizzle.config.ts     # Drizzle configuration
└── package.json
```

## Usage

```typescript
import { db } from "@repo/db"
import { todos, users } from "@repo/db/schema"

// Query examples
const allTodos = await db.select().from(todos)
const user = await db.query.users.findFirst({ where: eq(users.id, "123") })
```

## Environment Variables

| Variable       | Description                  |
| -------------- | ---------------------------- |
| `DATABASE_URL` | PostgreSQL connection string |

## Scripts

| Command            | Description             |
| ------------------ | ----------------------- |
| `pnpm db:push`     | Push schema to database |
| `pnpm db:studio`   | Open Drizzle Studio     |
| `pnpm db:generate` | Generate migrations     |
| `pnpm db:migrate`  | Run migrations          |
| `pnpm db:seed`     | Push schema, then seed users and mock data |

## Adding Tables

1. Create schema in `src/schema/`:

```typescript
// src/schema/posts.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const posts = pgTable("posts", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
})
```

2. Export from `src/schema/index.ts`
3. Run `pnpm db:push` to sync with database
