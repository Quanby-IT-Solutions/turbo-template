import { pgTable, uuid, varchar, text } from 'drizzle-orm/pg-core';

export const doctorCategories = pgTable('DoctorCategory', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
});
