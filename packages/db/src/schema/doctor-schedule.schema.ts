import { pgTable, uuid, varchar, timestamp, boolean, unique } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

export const doctorSchedules = pgTable(
  'DoctorSchedule',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctorId').notNull().references(() => users.id),
    dayOfWeek: varchar('dayOfWeek', { length: 50 }).notNull(),
    startTime: timestamp('startTime').notNull(),
    endTime: timestamp('endTime').notNull(),
    isAvailable: boolean('isAvailable').default(false).notNull(),
  },
  (table) => ({
    uniqueDoctorDay: unique().on(table.doctorId, table.dayOfWeek),
  }),
).enableRLS();
