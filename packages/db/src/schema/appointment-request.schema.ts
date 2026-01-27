import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { appointmentStatusEnum, priorityEnum } from './enums.js';
import { users } from './user.schema.js';
import { consultations } from './consultation.schema.js';

export const appointmentRequests = pgTable(
  'AppointmentRequest',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patientId').notNull().references(() => users.id),
    doctorId: uuid('doctorId').notNull().references(() => users.id),
    requestedDate: timestamp('requestedDate').notNull(),
    requestedTime: varchar('requestedTime', { length: 50 }).notNull(),
    reason: text('reason').notNull(),
    status: appointmentStatusEnum('status').default('PENDING').notNull(),
    priority: priorityEnum('priority').default('NORMAL').notNull(),
    notes: text('notes'),
    consultationId: uuid('consultationId').references(() => consultations.id),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    patientIdIdx: index('appointmentRequest_patientId_idx').on(table.patientId),
    doctorIdIdx: index('appointmentRequest_doctorId_idx').on(table.doctorId),
    statusIdx: index('appointmentRequest_status_idx').on(table.status),
    requestedDateIdx: index('appointmentRequest_requestedDate_idx').on(table.requestedDate),
  }),
).enableRLS();
