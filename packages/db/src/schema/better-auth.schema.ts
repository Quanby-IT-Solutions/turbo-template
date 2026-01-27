/**
 * Better Auth schema tables
 * These tables are used by Better Auth for authentication and session management
 * NOTE: We now use our unified User table instead of a separate user table
 */
import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

// Session table - references our unified User table
// userId is stored as text (UUID converted to string) for Better Auth compatibility
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull(), // UUID stored as text to reference our User table
  // Note: We use text instead of foreign key to avoid type mismatch (UUID vs text)
  // Better Auth will handle the reference via string conversion
}).enableRLS();

// Account table (for OAuth providers and password storage)
// Better Auth stores passwords here, not in the user table
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull(), // UUID stored as text to reference our User table
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'), // Better Auth stores password here, not in user table
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}).enableRLS();

// Verification table (for email verification)
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}).enableRLS();
