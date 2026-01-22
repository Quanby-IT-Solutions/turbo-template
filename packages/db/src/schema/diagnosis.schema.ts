import { pgTable, uuid, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { diagnosisSeverityEnum, diagnosisStatusEnum } from './enums.js';
import { users } from './user.schema.js';
import { consultations } from './consultation.schema.js';

export const diagnoses = pgTable(
  'Diagnosis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patientId').notNull().references(() => users.id),
    doctorId: uuid('doctorId').notNull().references(() => users.id),
    consultationId: uuid('consultationId').references(() => consultations.id),
    roomId: varchar('roomId', { length: 255 }),
    diagnosisCode: varchar('diagnosisCode', { length: 50 }),
    diagnosisName: varchar('diagnosisName', { length: 255 }).notNull(),
    description: text('description'),
    severity: diagnosisSeverityEnum('severity').default('MILD').notNull(),
    status: diagnosisStatusEnum('status').default('ACTIVE').notNull(),
    onsetDate: timestamp('onsetDate'),
    diagnosedAt: timestamp('diagnosedAt').defaultNow().notNull(),
    resolvedAt: timestamp('resolvedAt'),
    notes: text('notes'),
    isPrimary: boolean('isPrimary').default(false).notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    patientIdIdx: index('diagnosis_patientId_idx').on(table.patientId),
    doctorIdIdx: index('diagnosis_doctorId_idx').on(table.doctorId),
    consultationIdIdx: index('diagnosis_consultationId_idx').on(table.consultationId),
    roomIdIdx: index('diagnosis_roomId_idx').on(table.roomId),
    diagnosisCodeIdx: index('diagnosis_diagnosisCode_idx').on(table.diagnosisCode),
    statusIdx: index('diagnosis_status_idx').on(table.status),
    diagnosedAtIdx: index('diagnosis_diagnosedAt_idx').on(table.diagnosedAt),
  }),
).enableRLS();
