import { pgTable, uuid, varchar, unique } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

export const insuranceInfos = pgTable(
  'InsuranceInfo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patientId').notNull().unique().references(() => users.id),
    providerName: varchar('providerName', { length: 255 }).notNull(),
    policyNumber: varchar('policyNumber', { length: 255 }).notNull(),
    insuranceContact: varchar('insuranceContact', { length: 255 }).notNull(),
  },
).enableRLS();
