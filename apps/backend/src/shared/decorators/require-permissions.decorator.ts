import { SetMetadata } from "@nestjs/common"

import type { PermissionName } from "@repo/contracts"

/**
 * Stable metadata key under which required permissions are stored.
 * Read by {@link RbacGuard} via the Reflector.
 */
export const REQUIRED_PERMISSIONS_KEY = "required_permissions"

/**
 * Attach required permissions to a route handler (or controller class).
 *
 * The `RbacGuard` enforces AND semantics: the caller must hold every listed
 * permission. The union with `string` keeps the API open for permissions not
 * yet in the catalog; `RbacService` fails closed for unknown names.
 *
 * @example
 * @RequirePermissions("posts:create")
 */
export const RequirePermissions = (...permissions: (PermissionName | string)[]) =>
	SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions)
