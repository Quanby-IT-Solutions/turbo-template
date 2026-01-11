import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { medicalRecordTypeEnum } from './enums.js';
import { users } from './user.schema.js';
import { consultations } from './consultation.schema.js';

export const patientMedicalHistories = pgTable(
  'PatientMedicalHistory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patientId').notNull().references(() => users.id),
    consultationId: uuid('consultationId').references(() => consultations.id),
    recordType: medicalRecordTypeEnum('recordType').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    isPublic: boolean('isPublic').default(false).notNull(),
    isSensitive: boolean('isSensitive').default(false).notNull(),
    createdBy: uuid('createdBy').notNull().references(() => users.id),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    patientIdIdx: index('patientMedicalHistory_patientId_idx').on(table.patientId),
    consultationIdIdx: index('patientMedicalHistory_consultationId_idx').on(table.consultationId),
    isPublicIdx: index('patientMedicalHistory_isPublic_idx').on(table.isPublic),
    recordTypeIdx: index('patientMedicalHistory_recordType_idx').on(table.recordType),
  }),
);
