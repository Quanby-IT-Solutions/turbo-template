import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { notificationTypeEnum, notificationPriorityEnum } from './enums.js';
import { users } from './user.schema.js';

export const notifications = pgTable(
  'Notification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    relatedId: varchar('relatedId', { length: 255 }),
    relatedType: varchar('relatedType', { length: 100 }),
    actionUrl: text('actionUrl'),
    isRead: boolean('isRead').default(false).notNull(),
    isArchived: boolean('isArchived').default(false).notNull(),
    priority: notificationPriorityEnum('priority').default('NORMAL').notNull(),
    metadata: jsonb('metadata'),
    readAt: timestamp('readAt'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    expiresAt: timestamp('expiresAt'),
  },
  (table) => ({
    userIdIdx: index('notifications_userId_idx').on(table.userId),
    isReadIdx: index('notifications_isRead_idx').on(table.isRead),
    isArchivedIdx: index('notifications_isArchived_idx').on(table.isArchived),
    typeIdx: index('notifications_type_idx').on(table.type),
    priorityIdx: index('notifications_priority_idx').on(table.priority),
    createdAtIdx: index('notifications_createdAt_idx').on(table.createdAt),
    userIdIsReadIdx: index('notifications_userId_isRead_idx').on(table.userId, table.isRead),
  }),
).enableRLS();
