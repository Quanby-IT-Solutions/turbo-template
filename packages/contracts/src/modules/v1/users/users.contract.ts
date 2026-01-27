import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const UserQuerySchema = PaginationSchema.extend({
	search: z.string().optional(),
	role: z.enum(["DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN", "ORGANIZATION"]).optional(),
})

export const SystemUserSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email(),
	emailVerified: z.boolean(),
	image: z.string().nullable().optional(),
	role: z.enum(["DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN", "ORGANIZATION"]),
	organizationId: z.string().uuid().nullable().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	profilePicture: z.string().nullable().optional(),
	profilePictureVerified: z.boolean(),
	profilePictureVerifiedBy: z.string().nullable().optional(),
	profilePictureVerifiedAt: z.string().datetime().nullable().optional(),
})

export const CreateUserSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email format"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	role: z.enum(["DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN", "ORGANIZATION"]),
	organizationId: z.string().uuid().nullish(),
})

export const UpdateUserSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	email: z.string().email("Invalid email format").optional(),
	role: z.enum(["DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN", "ORGANIZATION"]).optional(),
	organizationId: z.string().uuid().nullable().optional(),
	emailVerified: z.boolean().optional(),
})

export const ResetPasswordSchema = z.object({
	newPassword: z.string().min(8, "Password must be at least 8 characters"),
})

// ============================================================================
// DTOs
// ============================================================================

export class UserQueryDto extends createZodDto(UserQuerySchema) {}

export class CreateUserDto extends createZodDto(CreateUserSchema) {}

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}

export class SystemUserResponseDto extends createZodDto(ApiSuccessResponseSchema(SystemUserSchema)) {}

export class SystemUserListResponseDto extends createZodDto(ApiSuccessResponseSchema(SystemUserSchema.array())) {}
