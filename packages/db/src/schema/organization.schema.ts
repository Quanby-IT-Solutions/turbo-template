import { pgTable, uuid, varchar, text, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { subscriptionTierEnum, organizationApprovalStatusEnum } from './enums.js';

export const organizations = pgTable(
  'Organization',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    description: text('description'),
    address: text('address'),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    website: varchar('website', { length: 255 }),
    isActive: boolean('isActive').default(true).notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    subscriptionTier: subscriptionTierEnum('subscriptionTier').default('FREE').notNull(),
    maxDoctors: integer('maxDoctors'),
    maxPatientsPerDoctor: integer('maxPatientsPerDoctor'),
    maxFaceScansPerDoctor: integer('maxFaceScansPerDoctor'),
    currentDoctors: integer('currentDoctors').default(0).notNull(),
    subscriptionStartDate: timestamp('subscriptionStartDate'),
    subscriptionEndDate: timestamp('subscriptionEndDate'),
    isSubscriptionActive: boolean('isSubscriptionActive').default(true).notNull(),
    approvalStatus: organizationApprovalStatusEnum('approvalStatus').default('PENDING').notNull(),
    approvalStatusUpdatedBy: varchar('approvalStatusUpdatedBy', { length: 255 }),
    approvalStatusUpdatedAt: timestamp('approvalStatusUpdatedAt'),
    approvalRejectionReason: text('approvalRejectionReason'),
  },
  (table) => ({
    subscriptionTierIdx: index('organization_subscriptionTier_idx').on(table.subscriptionTier),
    isSubscriptionActiveIdx: index('organization_isSubscriptionActive_idx').on(table.isSubscriptionActive),
    approvalStatusIdx: index('organization_approvalStatus_idx').on(table.approvalStatus),
  }),
);
