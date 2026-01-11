import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sexEnum } from './enums.js';
import { users } from './user.schema.js';

export const adminInfos = pgTable(
  'AdminInfo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('userId').notNull().unique().references(() => users.id),
    firstName: varchar('firstName', { length: 255 }).notNull(),
    middleName: varchar('middleName', { length: 255 }),
    lastName: varchar('lastName', { length: 255 }).notNull(),
    gender: sexEnum('gender').notNull(),
    dateOfBirth: timestamp('dateOfBirth').notNull(),
    contactNumber: varchar('contactNumber', { length: 50 }).notNull(),
    address: text('address').notNull(),
    bio: text('bio'),
    department: varchar('department', { length: 255 }),
    position: varchar('position', { length: 255 }),
    employeeId: varchar('employeeId', { length: 255 }),
  },
  (table) => ({
    employeeIdIdx: index('adminInfo_employeeId_idx').on(table.employeeId),
    departmentIdx: index('adminInfo_department_idx').on(table.department),
  }),
);
