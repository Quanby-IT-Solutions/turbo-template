import { pgTable, uuid, time, integer, json, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organization.schema.js';

export const organizationSettings = pgTable(
  'OrganizationSettings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organizationId').notNull().unique().references(() => organizations.id),
    
    // Clinic operating hours
    clinicStartTime: time('clinicStartTime').notNull().default('08:00:00'),
    clinicEndTime: time('clinicEndTime').notNull().default('17:00:00'),
    
    // Break times
    breakStartTime: time('breakStartTime'),
    breakEndTime: time('breakEndTime'),
    
    // Appointment slot configuration
    appointmentSlotDuration: integer('appointmentSlotDuration').notNull().default(30), // in minutes
    maxAppointmentsPerSlot: integer('maxAppointmentsPerSlot').notNull().default(1),
    
    // Booking window
    bookingWindowDays: integer('bookingWindowDays').notNull().default(30), // how many days in advance
    minAdvanceBookingHours: integer('minAdvanceBookingHours').notNull().default(2), // minimum hours before appointment
    
    // Working days (JSON array of day names)
    workingDays: json('workingDays').notNull().default(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']),
    
    // Additional settings (for future extensibility)
    additionalSettings: json('additionalSettings'),
    
    // Timestamps
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    organizationIdIdx: index('organizationSettings_organizationId_idx').on(table.organizationId),
  }),
).enableRLS();
