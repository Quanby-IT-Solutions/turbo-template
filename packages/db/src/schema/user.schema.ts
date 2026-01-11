import { pgTable, uuid, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { roleEnum } from './enums.js';
import { organizations } from './organization.schema.js';

/**
 * Unified User table - used for both application business logic AND Better Auth authentication
 * This table is compatible with Better Auth requirements while maintaining our business logic fields
 */
export const users = pgTable(
  'User',
  {
    // Primary key - UUID (stored as text for Better Auth compatibility)
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Better Auth required fields
    name: varchar('name', { length: 255 }).notNull(), // Better Auth requires 'name'
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('emailVerified').default(false).notNull(), // Better Auth requires 'emailVerified'
    image: text('image'), // Better Auth optional field (can use profilePicture)
    
    // Application fields
    password: varchar('password', { length: 255 }).notNull(), // Kept for backward compatibility
    role: roleEnum('role').notNull(),
    organizationId: uuid('organizationId').references(() => organizations.id),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    
    // Business logic fields
    profilePicture: text('profilePicture'), // Can be used as Better Auth 'image' field
    profilePictureVerified: boolean('profilePictureVerified').default(false).notNull(),
    profilePictureVerifiedBy: varchar('profilePictureVerifiedBy', { length: 255 }),
    profilePictureVerifiedAt: timestamp('profilePictureVerifiedAt'),
  },
  (table) => ({
    profilePictureVerifiedIdx: index('user_profilePictureVerified_idx').on(table.profilePictureVerified),
    profilePictureVerifiedByIdx: index('user_profilePictureVerifiedBy_idx').on(table.profilePictureVerifiedBy),
  }),
);
