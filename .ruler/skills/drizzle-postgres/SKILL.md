---
name: drizzle-postgres
description: Drizzle ORM with PostgreSQL patterns for this monorepo. Use when creating database tables, writing queries, defining relations, running migrations, or working with @repo/db. Triggers on tasks involving database schema, SQL queries, table definitions, foreign keys, indexes, or the db package.
frameworks:
  - drizzle-orm
languages:
  - typescript
category: database
updated: 2026-08-15
---

# Drizzle ORM + PostgreSQL Skill

## Quick Reference

**When to Use**: Creating tables, writing queries, defining relations, migrations, or any work in `packages/db/`

**Package**: `@repo/db` with sub-path exports: `@repo/db/schema` (tables + relations), `@repo/db/client` (factory)

**Version**: Drizzle ORM 1.0 (beta), PostgreSQL dialect, `drizzle-kit` for migrations

## Package Structure

```
packages/db/
├── drizzle.config.ts      # Drizzle Kit config (migrations, dialect)
├── src/
│   ├── client.ts           # createDBClient() factory
│   ├── schema.ts           # All tables, relations, and schema export
│   ├── utils/
│   │   └── table.ts        # pgTableCreator helper
│   └── migrations/         # Generated migration files
```

**Sub-path Exports:**
```typescript
import { createDBClient } from "@repo/db/client"   // Factory function
import { todos, users, schema } from "@repo/db/schema"  // Tables and schema
```

## Essential Patterns

### Table Definition with `createTable`

```typescript
// packages/db/src/schema.ts
import { index, primaryKey } from "drizzle-orm/pg-core"
import { createTable } from "./utils/table.js"

// Basic table with timestamps
export const todos = createTable("todos", t => ({
  id: t.serial("id").primaryKey(),
  title: t.text("title").notNull(),
  completed: t.boolean("completed").default(false).notNull(),
  authorId: t.text("author_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: t.timestamp("created_at").notNull().defaultNow(),
  updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
}))

// Table with composite primary key and indexes
export const accounts = createTable(
  "accounts",
  t => ({
    providerId: t.text("provider_id").notNull(),
    accountId: t.text("account_id").notNull(),
    userId: t.text("user_id").notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: t.text("access_token"),
    refreshToken: t.text("refresh_token"),
    createdAt: t.timestamp("created_at").notNull().defaultNow(),
    updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
  }),
  t => [
    primaryKey({ columns: [t.providerId, t.accountId] }),
    index("account_user_id_idx").on(t.userId),
  ]
)
```

**`createTable` helper:**
```typescript
// packages/db/src/utils/table.ts
import { pgTableCreator } from "drizzle-orm/pg-core"
export const createTable = pgTableCreator(name => name)
```

### Column Type Patterns

| Use Case | Drizzle Column | Example |
|----------|----------------|---------|
| Primary key (auto) | `t.serial("id").primaryKey()` | Todos |
| Primary key (text) | `t.text("id").primaryKey()` | Users (Better Auth) |
| Required text | `t.text("name").notNull()` | User name |
| Optional text | `t.text("image")` | Nullable by default |
| Boolean with default | `t.boolean("completed").default(false).notNull()` | Todo status |
| Timestamp | `t.timestamp("created_at").notNull().defaultNow()` | Audit columns |
| Foreign key | `t.text("user_id").references(() => users.id, { onDelete: "cascade" })` | Relations |
| Typed enum (no DB enum) | `t.text("priority").notNull().default("medium").$type<"low"\|"medium"\|"high"\|"urgent">()` | Tickets |
| JSONB with type | `t.jsonb("response").notNull().$type<unknown>()` | Idempotency |

### Typed-Enum Columns (`.$type<...>()`)

Enums are stored as `text` with a compile-time union via `.$type<...>()` rather
than a Postgres `enum` type — no migration churn when the value set changes, and
the union is enforced by TypeScript on every insert/update. Real usages:

```typescript
// tickets.priority / tickets.status
priority: t.text("priority").notNull().default("medium")
  .$type<"low" | "medium" | "high" | "urgent">(),
status: t.text("status").notNull().default("received")
  .$type<"received" | "in_progress" | "resolved" | "closed">(),

// auditLog.outcome
outcome: t.text("outcome").notNull().default("success").$type<"success" | "denied">(),
```

### Relations

```typescript
// packages/db/src/schema.ts
import { defineRelations } from "drizzle-orm"

// NOTE: `verifications` is a table but has NO relations, so it is absent from
// defineRelations. The RBAC/audit tables ARE present.
export const relations = defineRelations(
  {
    users, sessions, accounts, todos, tickets, idempotencyKeys,
    roles, permissions, userRoles, rolePermissions, auditLog,
  },
  r => ({
    users: {
      sessions: r.many.sessions(),
      accounts: r.many.accounts(),
      userRoles: r.many.userRoles(),
    },
    sessions: { user: r.one.users({ from: r.sessions.userId, to: r.users.id }) },
    accounts: { user: r.one.users({ from: r.accounts.userId, to: r.users.id }) },
    todos: { author: r.one.users({ from: r.todos.authorId, to: r.users.id }) },
    tickets: { author: r.one.users({ from: r.tickets.authorId, to: r.users.id }) },
    roles: {
      userRoles: r.many.userRoles(),
      rolePermissions: r.many.rolePermissions(),
    },
    permissions: { rolePermissions: r.many.rolePermissions() },
    auditLog: { actor: r.one.users({ from: r.auditLog.actorId, to: r.users.id }) },
    userRoles: {
      user: r.one.users({ from: r.userRoles.userId, to: r.users.id }),
      role: r.one.roles({ from: r.userRoles.roleId, to: r.roles.id }),
    },
    rolePermissions: {
      role: r.one.roles({ from: r.rolePermissions.roleId, to: r.roles.id }),
      permission: r.one.permissions({ from: r.rolePermissions.permissionId, to: r.permissions.id }),
    },
  })
)

// Combine tables and relations into one schema object. `verifications` IS in the
// schema object (Better Auth needs it) even though it has no relations.
export const schema = Object.assign(
  {
    users, sessions, accounts, verifications, todos, tickets, idempotencyKeys,
    roles, permissions, userRoles, rolePermissions,
  },
  relations
)
```

### Database Client

```typescript
// packages/db/src/client.ts
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { schema } from "./schema.js"

export type DBClient = NodePgDatabase<typeof schema>

export function createDBClient(connectionString?: string): DBClient {
  const connString = connectionString ?? process.env.DATABASE_URL
  if (!connString) throw new Error("DATABASE_URL environment variable is not set")
  return drizzle(connString, { schema })
}
```

### Backend Usage — Singleton Instance

```typescript
// apps/backend/src/common/database/database.client.ts
import { drizzle } from "drizzle-orm/node-postgres"
import { schema } from "@repo/db/schema"
import { env } from "@/config/env.config"

export const db = drizzle(env.DATABASE_URL, { schema })
```

### Common Queries

```typescript
import { desc, eq } from "drizzle-orm"
import { todos } from "@repo/db/schema"
import { db } from "@/common/database/database.client"

// Select all, ordered
const result = await db.select().from(todos)
  .orderBy(desc(todos.updatedAt))

// Select by ID
const [todo] = await db.select().from(todos)
  .where(eq(todos.id, id))

// Insert with returning
const [newTodo] = await db.insert(todos)
  .values({ title: "Test", completed: false, authorId: "user-1" })
  .returning()

// Update with returning
const [updated] = await db.update(todos)
  .set({ title: "Updated", updatedAt: new Date() })
  .where(eq(todos.id, id))
  .returning()

// Delete
await db.delete(todos).where(eq(todos.id, id))
```

### Drizzle Kit Config

```typescript
// packages/db/drizzle.config.ts
import "dotenv/config" // loads DATABASE_URL from .env before defineConfig reads it
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL || "" },
  schemaFilter: ["public"], // only manage the public schema
})
```

## Migration Workflow

| Command | Purpose |
|---------|---------|
| `pnpm db:push` | Push schema changes directly (development) |
| `pnpm db:generate` | Generate migration SQL files |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:studio` | Open Drizzle Studio GUI |

## Adding a New Table Checklist

1. Define table in `packages/db/src/schema.ts` using `createTable`
2. Add relations in the `defineRelations()` call
3. Add table to the `schema` object assignment
4. Run `pnpm db:push` (development) or `pnpm db:generate` + `pnpm db:migrate` (production)
5. Create corresponding Zod schemas in `@repo/contracts`

## Application Tables

Beyond `todos`, the schema carries RBAC, audit, idempotency and support-ticket
tables. All live in `packages/db/src/schema.ts`.

| Table | Key shape | Notes |
|-------|-----------|-------|
| `tickets` | `serial` id | `priority`/`status` typed-enum text columns; `authorId` nullable, `set null` on user delete |
| `idempotencyKeys` | composite PK `(authorId, key)` | replay cache; identity-scoped so users can't squat keys; `expiresAt` + index, swept |
| `roles` | `serial` id, `name` unique | RBAC |
| `permissions` | `serial` id, `name` unique | RBAC catalog |
| `userRoles` | composite PK `(userId, roleId)` | join; index on `userId` |
| `rolePermissions` | composite PK `(roleId, permissionId)` | join |
| `auditLog` | `serial` id | append-only; NO `updatedAt`; `outcome` typed-enum; `actorId` nullable `set null`; indexed on `createdAt`, `actorId` |

```typescript
// Composite PK + partial-index pattern (idempotency replay cache)
export const idempotencyKeys = createTable(
  "idempotency_keys",
  t => ({
    key: t.text("key").notNull(),
    authorId: t.text("author_id").notNull(),
    response: t.jsonb("response").notNull().$type<unknown>(),
    createdAt: t.timestamp("created_at").notNull().defaultNow(),
    expiresAt: t.timestamp("expires_at").notNull(),
  }),
  t => [
    primaryKey({ columns: [t.authorId, t.key] }), // identity-scoped, not global
    index("idempotency_keys_expires_at_idx").on(t.expiresAt), // sweeper deletes by expiry
  ]
)

// Append-only audit log: no updatedAt, no UPDATE/DELETE path exposed.
// Rows are written in the SAME transaction as the mutation they describe.
export const auditLog = createTable(
  "audit_log",
  t => ({
    id: t.serial("id").primaryKey(),
    domain: t.text("domain").notNull(),
    action: t.text("action").notNull(),
    outcome: t.text("outcome").notNull().default("success").$type<"success" | "denied">(),
    actorId: t.text("actor_id").references(() => users.id, { onDelete: "set null" }),
    targetType: t.text("target_type"),
    targetId: t.text("target_id"),
    oldValue: t.jsonb("old_value").$type<unknown>(),
    newValue: t.jsonb("new_value").$type<unknown>(),
    reason: t.text("reason"),
    createdAt: t.timestamp("created_at").notNull().defaultNow(),
  }),
  t => [
    index("audit_log_created_at_idx").on(t.createdAt),
    index("audit_log_actor_id_idx").on(t.actorId),
  ]
)
```

## Better Auth Tables

These tables are managed by Better Auth and should NOT be modified directly:

- `users` — User accounts (id, name, email, emailVerified, image)
- `sessions` — Active sessions (id, userId, token, expiresAt, ipAddress, userAgent)
- `accounts` — OAuth accounts (providerId, accountId, userId, tokens)
- `verifications` — Email/token verifications (id, identifier, value, expiresAt)

To regenerate auth schema: `pnpm auth:generate`
