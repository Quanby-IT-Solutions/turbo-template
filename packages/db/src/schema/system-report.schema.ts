import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { organizations } from './organization.schema.js';

/**
 * System Report Configuration and Storage
 * Stores configurations for different types of system reports
 * Excludes PHI (Protected Health Information) details
 */
export const systemReports = pgTable(
  'SystemReport',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Report metadata
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    reportType: varchar('reportType', { length: 100 }).notNull(), // e.g., 'APPOINTMENTS_SUMMARY', 'USER_ACTIVITY', 'SYSTEM_PERFORMANCE'
    
    // Organization context
    organizationId: uuid('organizationId').notNull().references(() => organizations.id),
    
    // Creator information
    createdBy: uuid('createdBy').notNull().references(() => users.id),
    
    // Report configuration (filters, parameters, etc.)
    configuration: jsonb('configuration').notNull(), // Stores report-specific config like date ranges, filters
    
    // Report data (aggregated, non-PHI)
    reportData: jsonb('reportData'), // Aggregated statistics, counts, trends (no PHI)
    
    // Status and scheduling
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, PROCESSING, COMPLETED, FAILED
    
    // Timestamps
    generatedAt: timestamp('generatedAt'),
    scheduledFor: timestamp('scheduledFor'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    organizationIdIdx: index('systemReport_organizationId_idx').on(table.organizationId),
    createdByIdx: index('systemReport_createdBy_idx').on(table.createdBy),
    reportTypeIdx: index('systemReport_reportType_idx').on(table.reportType),
    statusIdx: index('systemReport_status_idx').on(table.status),
    generatedAtIdx: index('systemReport_generatedAt_idx').on(table.generatedAt),
  }),
).enableRLS();

/**
 * Report Templates
 * Pre-defined report templates that admins can use
 */
export const reportTemplates = pgTable(
  'ReportTemplate',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Template details
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    reportType: varchar('reportType', { length: 100 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(), // e.g., 'ANALYTICS', 'OPERATIONS', 'COMPLIANCE'
    
    // Template configuration
    defaultConfiguration: jsonb('defaultConfiguration').notNull(),
    
    // System template flag
    isSystemTemplate: varchar('isSystemTemplate', { length: 10 }).default('false').notNull(), // Templates created by system vs custom
    
    // Availability
    isActive: varchar('isActive', { length: 10 }).default('true').notNull(),
    
    // Timestamps
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    reportTypeIdx: index('reportTemplate_reportType_idx').on(table.reportType),
    categoryIdx: index('reportTemplate_category_idx').on(table.category),
    isActiveIdx: index('reportTemplate_isActive_idx').on(table.isActive),
  }),
).enableRLS();
