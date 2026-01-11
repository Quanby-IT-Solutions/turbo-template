import { pgTable, uuid, varchar, text, unique } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

export const emergencyContacts = pgTable(
  'EmergencyContact',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patientId').notNull().unique().references(() => users.id),
    contactName: varchar('contactName', { length: 255 }).notNull(),
    relationship: varchar('relationship', { length: 100 }).notNull(),
    contactNumber: varchar('contactNumber', { length: 50 }).notNull(),
    contactAddress: text('contactAddress'),
  },
);
