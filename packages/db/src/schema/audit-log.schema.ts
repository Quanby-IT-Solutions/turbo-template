import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { auditCategoryEnum, auditLevelEnum } from './enums.js';
import { users } from './user.schema.js';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('userId').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 255 }).notNull(),
    category: auditCategoryEnum('category').notNull(),
    level: auditLevelEnum('level').notNull(),
    description: text('description').notNull(),
    ipAddress: varchar('ipAddress', { length: 100 }).notNull(),
    userAgent: text('userAgent').notNull(),
    resourceType: varchar('resourceType', { length: 100 }),
    resourceId: varchar('resourceId', { length: 255 }),
    details: jsonb('details'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    severity: varchar('severity', { length: 50 }).notNull(),
  },
  (table) => ({
    userIdIdx: index('auditLogs_userId_idx').on(table.userId),
    timestampIdx: index('auditLogs_timestamp_idx').on(table.timestamp),
    categoryIdx: index('auditLogs_category_idx').on(table.category),
    levelIdx: index('auditLogs_level_idx').on(table.level),
  }),
);
