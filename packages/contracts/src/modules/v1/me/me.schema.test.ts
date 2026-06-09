import { describe, expect, it } from "vitest"

import { MePermissionsSchema, type MePermissions } from "./me.schema"

describe("MePermissionsSchema", () => {
	it("parses current-user roles and permissions", () => {
		const result: MePermissions = MePermissionsSchema.parse({
			roles: ["Manager", "User"],
			permissions: ["posts:*", "users:read"],
		})

		expect(result.roles).toEqual(["Manager", "User"])
		expect(result.permissions).toEqual(["posts:*", "users:read"])
	})

	it("allows an admin role without expanded permissions", () => {
		const result = MePermissionsSchema.parse({
			roles: ["Admin"],
			permissions: [],
		})

		expect(result).toEqual({ roles: ["Admin"], permissions: [] })
	})

	it("allows custom non-catalog role names from the database", () => {
		const result = MePermissionsSchema.parse({
			roles: ["Owner"],
			permissions: [],
		})

		expect(result.roles).toEqual(["Owner"])
	})

	it("rejects non-catalog permission names", () => {
		const result = MePermissionsSchema.safeParse({
			roles: ["Owner"],
			permissions: ["billing:read"],
		})

		expect(result.success).toBe(false)
	})
})
