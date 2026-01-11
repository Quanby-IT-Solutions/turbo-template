import { pgTable, uuid, varchar, text, integer, timestamp, unique } from 'drizzle-orm/pg-core';
import { subscriptionTierEnum, subscriptionEntityTypeEnum } from './enums.js';

export const subscriptionTierSettings = pgTable(
  'SubscriptionTierSetting',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tier: subscriptionTierEnum('tier').notNull(),
    entityType: subscriptionEntityTypeEnum('entityType').notNull(),
    displayName: varchar('displayName', { length: 255 }).notNull(),
    description: text('description'),
    maxDoctors: integer('maxDoctors'),
    maxPatients: integer('maxPatients'),
    maxFaceScans: integer('maxFaceScans'),
    maxPatientsPerDoctor: integer('maxPatientsPerDoctor'),
    maxFaceScansPerDoctor: integer('maxFaceScansPerDoctor'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    uniqueTierEntity: unique().on(table.tier, table.entityType),
  }),
);
