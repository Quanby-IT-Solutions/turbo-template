import { pgTable, uuid, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

export const consultations = pgTable('Consultation', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorId: uuid('doctorId').notNull().references(() => users.id),
  patientId: uuid('patientId').notNull().references(() => users.id),
  startTime: timestamp('startTime').notNull(),
  endTime: timestamp('endTime'),
  consultationCode: varchar('consultationCode', { length: 50 }).notNull().unique(),
  isPublic: boolean('isPublic').default(false).notNull(),
  notes: text('notes'),
  diagnosis: text('diagnosis'),
  treatment: text('treatment'),
  followUpDate: timestamp('followUpDate'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}).enableRLS();
