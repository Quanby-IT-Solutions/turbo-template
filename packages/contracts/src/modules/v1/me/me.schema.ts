import { z } from "zod"

import { PermissionNameSchema } from "../rbac/rbac.catalog.js"

export const MePermissionsSchema = z.object({
	roles: z.array(z.string()),
	permissions: z.array(PermissionNameSchema),
})

export type MePermissions = z.infer<typeof MePermissionsSchema>
