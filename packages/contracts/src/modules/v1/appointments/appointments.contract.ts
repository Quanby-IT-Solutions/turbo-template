import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const AppointmentQuerySchema = PaginationSchema.extend({
	status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "REJECTED", "RESCHEDULED"]).optional(),
	patientId: z.string().uuid().optional(),
	doctorId: z.string().uuid().optional(),
})

export const AppointmentRequestSchema = z.object({
	patientId: z.string().uuid(),
	doctorId: z.string().uuid(),
	requestedDate: z.string().datetime(),
	requestedTime: z.string(),
	reason: z.string(),
	priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
	notes: z.string().optional(),
})

const DoctorInfoSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  specialization: z.string(),
})

const DoctorSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  doctorInfo: DoctorInfoSchema,
})

const PatientInfoSchema = z.object({
  firstName: z.string(),
  middleName: z.string().nullable().optional(),
  lastName: z.string(),
})

const PatientSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  patientInfo: PatientInfoSchema,
})

// Update AppointmentSchema with nested objects
export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  requestedDate: z.string().datetime(),
  requestedTime: z.string(),
  reason: z.string(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "REJECTED", "RESCHEDULED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  notes: z.string().nullable().optional(),
  consultationId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  doctor: DoctorSchema,
  patient: PatientSchema.nullable().optional(),
})

// Keep your list response schema
export const AppointmentListResponseSchema = z.object({
  items: AppointmentSchema.array(),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

// ============================================================================
// DTOs
// ============================================================================

export class AppointmentQueryDto extends createZodDto(AppointmentQuerySchema) {}

export class CreateAppointmentDto extends createZodDto(AppointmentRequestSchema) {}

export class AppointmentResponseDto extends createZodDto(ApiSuccessResponseSchema(AppointmentSchema)) {}

export class AppointmentListResponseDto extends createZodDto(ApiSuccessResponseSchema(AppointmentListResponseSchema)) {}
