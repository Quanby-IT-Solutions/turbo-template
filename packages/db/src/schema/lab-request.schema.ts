import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { labRequestStatusEnum, priorityEnum } from './enums.js';
import { users } from './user.schema.js';
import { organizations } from './organization.schema.js';

export const labRequests = pgTable(
  'LabRequest',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patientId').notNull().references(() => users.id),
    organizationId: uuid('organizationId').notNull().references(() => organizations.id),
    doctorId: uuid('doctorId').references(() => users.id),
    roomId: varchar('roomId', { length: 255 }),
    note: text('note'),
    createdBy: uuid('createdBy').notNull().references(() => users.id),
    updatedBy: uuid('updatedBy').references(() => users.id),
    status: labRequestStatusEnum('status').default('PENDING').notNull(),
    priority: priorityEnum('priority').default('NORMAL').notNull(),
    requestedTests: text('requestedTests'), // JSON string
    instructions: text('instructions'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    patientIdIdx: index('labRequest_patientId_idx').on(table.patientId),
    organizationIdIdx: index('labRequest_organizationId_idx').on(table.organizationId),
    doctorIdIdx: index('labRequest_doctorId_idx').on(table.doctorId),
    roomIdIdx: index('labRequest_roomId_idx').on(table.roomId),
    statusIdx: index('labRequest_status_idx').on(table.status),
    priorityIdx: index('labRequest_priority_idx').on(table.priority),
    createdAtIdx: index('labRequest_createdAt_idx').on(table.createdAt),
  }),
).enableRLS();
