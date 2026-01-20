import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const faceScanResults = pgTable(
  'FaceScanResult',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: varchar('firstName', { length: 255 }).notNull(),
    lastName: varchar('lastName', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    results: jsonb('results').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('faceScanResult_email_idx').on(table.email),
    createdAtIdx: index('faceScanResult_createdAt_idx').on(table.createdAt),
  }),
).enableRLS();
