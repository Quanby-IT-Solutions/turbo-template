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
	// AZ-5 / F-51: directory PII, split from `users:read`.
	//
	// `users:read` grants operational reads — the user list with names and
	// roles, and (per AZ-1) support-ticket triage. It used to also yield every
	// email address, so granting someone ticket triage handed them the complete
	// email directory as a side effect.
	//
	// Note the naming: `users:read-directory` is deliberately NOT
	// `users:directory-read`, because the wildcard convention above matches on
	// the segment before the colon. A `users:*` holder still gets it, which is
	// intended — that wildcard means "everything about users".
	"users:read-directory",
] as const

/** Zod enum validating a permission name. */
export const PermissionNameSchema = z.enum(PERMISSION_NAMES)

/** A valid permission name. */
export type PermissionName = z.infer<typeof PermissionNameSchema>
