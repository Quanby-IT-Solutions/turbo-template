import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { consultations } from './consultation.schema.js';

export const prescriptions = pgTable(
  'Prescription',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patientId').notNull().references(() => users.id),
    doctorId: uuid('doctorId').notNull().references(() => users.id),
    consultationId: uuid('consultationId').references(() => consultations.id),
    roomId: varchar('roomId', { length: 255 }),
    medicationName: varchar('medicationName', { length: 255 }).notNull(),
    dosage: varchar('dosage', { length: 255 }).notNull(),
    frequency: varchar('frequency', { length: 255 }).notNull(),
    duration: varchar('duration', { length: 255 }).notNull(),
    instructions: text('instructions'),
    quantity: integer('quantity'),
    refills: integer('refills').default(0).notNull(),
    isActive: boolean('isActive').default(true).notNull(),
    prescribedAt: timestamp('prescribedAt').defaultNow().notNull(),
    expiresAt: timestamp('expiresAt'),
    notes: text('notes'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    patientIdIdx: index('prescription_patientId_idx').on(table.patientId),
    doctorIdIdx: index('prescription_doctorId_idx').on(table.doctorId),
    consultationIdIdx: index('prescription_consultationId_idx').on(table.consultationId),
    roomIdIdx: index('prescription_roomId_idx').on(table.roomId),
    isActiveIdx: index('prescription_isActive_idx').on(table.isActive),
    prescribedAtIdx: index('prescription_prescribedAt_idx').on(table.prescribedAt),
  }),
);
