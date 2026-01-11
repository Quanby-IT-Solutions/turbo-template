import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema } from "../../../common/common.contract.js"

// ============================================================================
// ENUMS (from @repo/db/schema)
// ============================================================================

export const RoleEnum = z.enum(["DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN", "ORGANIZATION"])
export const SubscriptionTierEnum = z.enum(["FREE", "BASIC", "PREMIUM", "ENTERPRISE", "T"])
export const SexEnum = z.enum(["MALE", "FEMALE", "OTHER"])
export const MedicalLicenseLevelEnum = z.enum(["S1", "S2", "S3"])
export const PhilHealthAccreditationEnum = z.enum([
	"ACCREDITED",
	"PENDING",
	"SUSPENDED",
	"EXPIRED",
	"NOT_ACCREDITED",
	"UNDER_REVIEW",
])

// ============================================================================
// SCHEMAS
// ============================================================================

export const LoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
})

export const RegisterSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	role: RoleEnum,
	subscriptionTier: SubscriptionTierEnum.optional(),
	// Patient fields
	firstName: z.string().optional(),
	middleName: z.string().optional(),
	lastName: z.string().optional(),
	fullName: z.string().optional(), // Legacy support
	gender: SexEnum.optional(),
	dateOfBirth: z.string().datetime().optional(),
	contactNumber: z.string().optional(),
	address: z.string().optional(),
	weight: z.number().optional(),
	height: z.number().optional(),
	bloodType: z.string().optional(),
	medicalHistory: z.string().optional(),
	allergies: z.string().optional(),
	medications: z.string().optional(),
	// Emergency contact
	emergencyContactName: z.string().optional(),
	emergencyContactRelationship: z.string().optional(),
	emergencyContactNumber: z.string().optional(),
	emergencyContactAddress: z.string().optional(),
	// Insurance
	insuranceProviderName: z.string().optional(),
	insurancePolicyNumber: z.string().optional(),
	insuranceContact: z.string().optional(),
	// Doctor fields
	organizationId: z.string().uuid().optional(),
	specialization: z.string().optional(),
	qualifications: z.string().optional(),
	experience: z.number().optional(),
	bio: z.string().optional(),
	prcId: z.string().optional(),
	ptrId: z.string().optional(),
	medicalLicenseLevel: MedicalLicenseLevelEnum.optional(),
	philHealthAccreditation: PhilHealthAccreditationEnum.optional(),
	licenseNumber: z.string().optional(),
	licenseExpiry: z.string().datetime().optional(),
	isLicenseActive: z.boolean().optional(),
	// Organization fields
	website: z.string().optional(),
})

export const UserSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email(),
	emailVerified: z.boolean(),
	image: z.string().nullable().optional(),
	role: RoleEnum,
	organizationId: z.string().uuid().nullable().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	profilePicture: z.string().nullable().optional(),
	profilePictureVerified: z.boolean().optional(),
	profilePictureVerifiedBy: z.string().nullable().optional(),
	profilePictureVerifiedAt: z.string().datetime().nullable().optional(),
})

export type User = z.infer<typeof UserSchema>

// ============================================================================
// DTOs
// ============================================================================

export class LoginDto extends createZodDto(LoginSchema) {}

export class RegisterDto extends createZodDto(RegisterSchema) {}

export class UserResponseDto extends createZodDto(ApiSuccessResponseSchema(UserSchema)) {}

export class UserListResponseDto extends createZodDto(ApiSuccessResponseSchema(UserSchema.array())) {}
