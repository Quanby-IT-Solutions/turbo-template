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
// TYPES
// ============================================================================
export type Role = z.infer<typeof RoleSchema>
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>
export type UpdateRoleRequest = z.infer<typeof UpdateRoleRequestSchema>
export type SetRolePermissionsRequest = z.infer<typeof SetRolePermissionsRequestSchema>
export type PermissionCatalogEntry = z.infer<typeof PermissionSchema>
export type UserWithRoles = z.infer<typeof UserWithRolesSchema>
export type AssignRoleRequest = z.infer<typeof AssignRoleRequestSchema>
export type RemoveRoleRequest = z.infer<typeof RemoveRoleRequestSchema>
