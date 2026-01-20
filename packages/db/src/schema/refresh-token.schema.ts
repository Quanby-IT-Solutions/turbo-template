import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 500 }).notNull().unique(),
    expiresAt: timestamp('expiresAt').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
).enableRLS();
