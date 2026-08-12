import { z } from "zod"

import { PermissionNameSchema } from "./rbac.catalog.js"

// ============================================================================
// SHARED
// ============================================================================
const dateField = z
	.union([z.date(), z.string()])
	.transform(val => (typeof val === "string" ? new Date(val) : val))

const RoleIdParamSchema = z.object({
	id: z.coerce.number().int().positive(),
})

// ============================================================================
// ROLES
// ============================================================================
export const RoleSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1),
	description: z.string().nullable(),
	permissions: z.array(PermissionNameSchema),
	userCount: z.number().int().nonnegative(),
	createdAt: dateField,
	updatedAt: dateField,
})

export const CreateRoleSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name too long"),
	description: z.string().max(255, "Description too long").optional(),
})

/** Update route input: id from path + optional name/description */
export const UpdateRoleRequestSchema = RoleIdParamSchema.extend({
	name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
	description: z.string().max(255, "Description too long").nullable().optional(),
})

/** Set-permissions route input: id from path + full permission list */
export const SetRolePermissionsRequestSchema = RoleIdParamSchema.extend({
	permissions: z.array(PermissionNameSchema),
})

export const RoleIdSchema = RoleIdParamSchema

export const DeleteRoleResponseSchema = z.object({
	success: z.boolean(),
	id: z.number().int().positive(),
})

// ============================================================================
// PERMISSIONS (read-only catalog)
// ============================================================================
export const PermissionSchema = z.object({
	name: PermissionNameSchema,
	description: z.string().nullable(),
})

// ============================================================================
// USERS
// ============================================================================
export const UserWithRolesSchema = z.object({
	id: z.string(),
	name: z.string().nullable(),
	email: z.string(),
	roles: z.array(z.string()),
})

/** Assign route input: userId from path + roleName from body */
export const AssignRoleRequestSchema = z.object({
	userId: z.string().min(1),
	roleName: z.string().min(1),
})

/** Remove route input: userId + roleName, both from path */
export const RemoveRoleRequestSchema = z.object({
	userId: z.string().min(1),
	roleName: z.string().min(1),
})

export const UserRoleMutationResponseSchema = z.object({
	success: z.boolean(),
	userId: z.string(),
	roleName: z.string(),
})

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * Whether a recorded attempt went through or was refused. Denials are kept
 * because "who tried to escalate and was stopped" is the question an audit
 * trail most often has to answer (AZ-4 / F-17).
 */
export const AuditOutcomeSchema = z.enum(["success", "denied"])

export const AuditLogEntrySchema = z.object({
	id: z.number().int(),
	domain: z.string(),
	action: z.string(),
	outcome: AuditOutcomeSchema,
	actorId: z.string().nullable(),
	/** Resolved for display; null when the actor's account no longer exists. */
	actorEmail: z.string().nullable(),
	targetType: z.string().nullable(),
	targetId: z.string().nullable(),
	oldValue: z.unknown().nullable(),
	newValue: z.unknown().nullable(),
	reason: z.string().nullable(),
	createdAt: z.date(),
})

/** Reverse-chronological page of audit entries. */
export const ListAuditLogRequestSchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).optional().default(50),
	/** Return only entries older than this id — cursor paging, stable under
	 *  concurrent appends in a way OFFSET is not. */
	before: z.coerce.number().int().positive().optional(),
})

export const ListAuditLogResponseSchema = z.object({
	entries: z.array(AuditLogEntrySchema),
	nextCursor: z.number().int().nullable(),
})

// ============================================================================
// TYPES
// ============================================================================
export type AuditOutcome = z.infer<typeof AuditOutcomeSchema>
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>
export type ListAuditLogRequest = z.infer<typeof ListAuditLogRequestSchema>
export type ListAuditLogResponse = z.infer<typeof ListAuditLogResponseSchema>
export type Role = z.infer<typeof RoleSchema>
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>
export type UpdateRoleRequest = z.infer<typeof UpdateRoleRequestSchema>
export type SetRolePermissionsRequest = z.infer<typeof SetRolePermissionsRequestSchema>
export type PermissionCatalogEntry = z.infer<typeof PermissionSchema>
export type UserWithRoles = z.infer<typeof UserWithRolesSchema>
export type AssignRoleRequest = z.infer<typeof AssignRoleRequestSchema>
export type RemoveRoleRequest = z.infer<typeof RemoveRoleRequestSchema>
