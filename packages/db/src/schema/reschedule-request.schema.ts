import { pgTable, uuid, varchar, timestamp, index, text } from 'drizzle-orm/pg-core';
import { rescheduleStatusEnum, rescheduleProposedByEnum, roleEnum } from './enums.js';
import { appointmentRequests } from './appointment-request.schema.js';
import { users } from './user.schema.js';

export const rescheduleRequests = pgTable(
  'RescheduleRequest',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appointmentId: uuid('appointmentId').notNull().references(() => appointmentRequests.id),
    requestedBy: uuid('requestedBy').notNull().references(() => users.id),
    requestedByRole: roleEnum('requestedByRole').notNull(),
    currentDate: timestamp('currentDate').notNull(),
    currentTime: varchar('currentTime', { length: 50 }).notNull(),
    newDate: timestamp('newDate').notNull(),
    newTime: varchar('newTime', { length: 50 }).notNull(),
    reason: text('reason').notNull(),
    status: rescheduleStatusEnum('status').default('PENDING').notNull(),
    proposedBy: rescheduleProposedByEnum('proposedBy').notNull(),
    notes: text('notes'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    resolvedAt: timestamp('resolvedAt'),
  },
  (table) => ({
    appointmentIdIdx: index('rescheduleRequest_appointmentId_idx').on(table.appointmentId),
    requestedByIdx: index('rescheduleRequest_requestedBy_idx').on(table.requestedBy),
    statusIdx: index('rescheduleRequest_status_idx').on(table.status),
    newDateIdx: index('rescheduleRequest_newDate_idx').on(table.newDate),
  }),
);
