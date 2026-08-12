import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AssignRoleRequestSchema,
	CreateRoleSchema,
	DeleteRoleResponseSchema,
	ListAuditLogRequestSchema,
	ListAuditLogResponseSchema,
	PermissionSchema,
	RemoveRoleRequestSchema,
	RoleIdSchema,
	RoleSchema,
	SetRolePermissionsRequestSchema,
	UpdateRoleRequestSchema,
	UserRoleMutationResponseSchema,
	UserWithRolesSchema,
} from "./rbac.schema.js"

/**
 * RBAC administration contract.
 *
 * Reads require `users:read`, writes require `users:manage` (enforced by the
 * backend RbacGuard). Permissions are a fixed catalog; this surface assigns
 * existing catalog permissions to roles, it does not mint new permissions.
 */
export const rbacContract = {
	roles: {
		list: oc
			.route({
				method: "GET",
				path: "/rbac/roles",
				summary: "List roles",
				description: "List all roles with their assigned permissions and user counts.",
				tags: ["RBAC"],
			})
			.output(z.array(RoleSchema)),

		create: oc
			.route({
				method: "POST",
				path: "/rbac/roles",
				summary: "Create role",
				description: "Create a new role.",
				tags: ["RBAC"],
			})
			.input(CreateRoleSchema)
			.output(RoleSchema),

		update: oc
			.route({
				method: "PUT",
				path: "/rbac/roles/{id}",
				summary: "Update role",
				description: "Update a role's name or description.",
				tags: ["RBAC"],
			})
			.input(UpdateRoleRequestSchema)
			.output(RoleSchema),

		setPermissions: oc
			.route({
				method: "PUT",
				path: "/rbac/roles/{id}/permissions",
				summary: "Set role permissions",
				description: "Replace the full set of permissions granted to a role.",
				tags: ["RBAC"],
			})
			.input(SetRolePermissionsRequestSchema)
			.output(RoleSchema),

		delete: oc
			.route({
				method: "DELETE",
				path: "/rbac/roles/{id}",
				summary: "Delete role",
				description: "Delete a role.",
				tags: ["RBAC"],
			})
			.input(RoleIdSchema)
			.output(DeleteRoleResponseSchema),
	},

	permissions: {
		list: oc
			.route({
				method: "GET",
				path: "/rbac/permissions",
				summary: "List permissions",
				description: "List the permission catalog.",
				tags: ["RBAC"],
			})
			.output(z.array(PermissionSchema)),
	},

	users: {
		list: oc
			.route({
				method: "GET",
				path: "/rbac/users",
				summary: "List users",
				description: "List all users with their assigned role names.",
				tags: ["RBAC"],
			})
			.output(z.array(UserWithRolesSchema)),

		assignRole: oc
			.route({
				method: "POST",
				path: "/rbac/users/{userId}/roles",
				summary: "Assign role to user",
				description: "Assign a role to a user by role name.",
				tags: ["RBAC"],
			})
			.input(AssignRoleRequestSchema)
			.output(UserRoleMutationResponseSchema),

		removeRole: oc
			.route({
				method: "DELETE",
				path: "/rbac/users/{userId}/roles/{roleName}",
				summary: "Remove role from user",
				description: "Remove a role from a user by role name.",
				tags: ["RBAC"],
			})
			.input(RemoveRoleRequestSchema)
			.output(UserRoleMutationResponseSchema),
	},

	/**
	 * Append-only audit trail (AZ-4 / F-17). Read-only by design: there is no
	 * update or delete route here, and none may be added — a log the
	 * application can rewrite is not evidence.
	 */
	audit: {
		list: oc
			.route({
				method: "GET",
				path: "/rbac/audit-log",
				summary: "List audit log entries",
				description: "List privileged-mutation audit entries, newest first. Requires `users:read`.",
				tags: ["RBAC"],
			})
			.input(ListAuditLogRequestSchema)
			.output(ListAuditLogResponseSchema),
	},
}
