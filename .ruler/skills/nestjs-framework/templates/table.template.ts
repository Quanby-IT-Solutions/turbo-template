// TEMPLATE: Drizzle table (replaces the old TypeORM @Entity). Add to
// packages/db/src/schema.ts, then wire relations + the schema object.
// Placeholders: {{table-name}} table var + db name, {{entity-name}} unused-ok.
// Model: the `todos` / `tickets` tables in packages/db/src/schema.ts.
import { index } from "drizzle-orm/pg-core"

import { createTable } from "./utils/table.js"
// import { users } from "./schema.js" // for the authorId FK

export const {{table-name}} = createTable(
  "{{table-name}}",
  t => ({
    id: t.serial("id").primaryKey(),
    name: t.text("name").notNull(),
    // Typed-enum-as-text (no DB enum, compile-time union):
    status: t.text("status").notNull().default("active").$type<"active" | "archived">(),
    // Owner FK — cascade for owned data, set null for audit-style tables:
    authorId: t
      .text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: t.timestamp("created_at").notNull().defaultNow(),
    updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
  }),
  t => [index("{{table-name}}_author_id_idx").on(t.authorId)]
)

// 1. Add `{{table-name}}` to defineRelations(...) with an `author` r.one.users(...).
// 2. Add `{{table-name}}` to the exported `schema` object.
// 3. pnpm -F @repo/db db:push (dev) or db:generate + db:migrate (prod).
