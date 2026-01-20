import { pgTable, uuid, unique } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { doctorCategories } from './doctor-category.schema.js';

export const usersToDoctorCategories = pgTable(
  'users_to_doctor_categories',
  {
    userId: uuid('userId')
      .notNull()
      .references(() => users.id),
    doctorCategoryId: uuid('doctorCategoryId')
      .notNull()
      .references(() => doctorCategories.id),
  },
  (t) => ({
    pk: unique().on(t.userId, t.doctorCategoryId),
  }),
).enableRLS();
