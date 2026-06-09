import { z } from "zod"

/**
 * RBAC catalog
 *
 * Shared role and permission constants, Zod enums, and inferred types.
 * Consumed by the backend RBAC guard, seed scripts, and the frontend.
 */

// ---------------------------------------------------------------------------
// Role names
// ---------------------------------------------------------------------------

/** Canonical role names. Order is significant for display only. */
export const ROLE_NAMES = ["Admin", "Manager", "User"] as const

/** Zod enum validating a role name. */
export const RoleNameSchema = z.enum(ROLE_NAMES)

/**
 * The super-role. The RBAC guard short-circuits and grants access when a
 * principal holds this role, regardless of the required permission.
 */
export const ADMIN_ROLE = "Admin" as const

/** A valid role name. */
export type RoleName = z.infer<typeof RoleNameSchema>

// ---------------------------------------------------------------------------
// Permission catalog
// ---------------------------------------------------------------------------

/**
 * Permission naming convention: `resource:action`.
 *
 * - `resource` is the noun being protected (e.g. `posts`, `users`).
 * - `action` is the verb performed on it (e.g. `read`, `create`).
 *
 * Wildcard semantics: `resource:*` grants all actions on that resource.
 * When checking a required permission `resource:<action>`, the guard treats a
 * granted `resource:*` as a match for any action on that resource. Example:
 * holding `posts:*` satisfies a required `posts:read`, `posts:create`,
 * `posts:edit`, or `posts:delete`.
 */
export const PERMISSION_NAMES = [
	// Granular post actions
	"posts:read",
	"posts:create",
	"posts:edit",
	"posts:delete",
	// Wildcard: grants all actions on the `posts` resource (resource:* convention)
	"posts:*",
	// User management actions
	"users:read",
	"users:manage",
] as const

/** Zod enum validating a permission name. */
export const PermissionNameSchema = z.enum(PERMISSION_NAMES)

/** A valid permission name. */
export type PermissionName = z.infer<typeof PermissionNameSchema>
