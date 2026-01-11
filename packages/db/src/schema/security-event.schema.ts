import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { auditLevelEnum } from './enums.js';
import { users } from './user.schema.js';

export const securityEvents = pgTable(
  'security_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: varchar('eventType', { length: 255 }).notNull(),
    severity: auditLevelEnum('severity').notNull(),
    description: text('description').notNull(),
    ipAddress: varchar('ipAddress', { length: 100 }).notNull(),
    userAgent: text('userAgent').notNull(),
    userId: uuid('userId').references(() => users.id, { onDelete: 'set null' }),
    details: jsonb('details'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    resolved: boolean('resolved').default(false).notNull(),
    resolvedAt: timestamp('resolvedAt'),
    resolvedBy: uuid('resolvedBy').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    userIdIdx: index('securityEvents_userId_idx').on(table.userId),
    timestampIdx: index('securityEvents_timestamp_idx').on(table.timestamp),
    eventTypeIdx: index('securityEvents_eventType_idx').on(table.eventType),
    severityIdx: index('securityEvents_severity_idx').on(table.severity),
    resolvedIdx: index('securityEvents_resolved_idx').on(table.resolved),
  }),
);
