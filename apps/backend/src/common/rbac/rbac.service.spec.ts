import { RbacService } from "./rbac.service"

jest.mock("@repo/contracts", () => ({
	ADMIN_ROLE: "Admin",
	PERMISSION_NAMES: [
		"posts:read",
		"posts:create",
		"posts:edit",
		"posts:delete",
		"posts:*",
		"users:read",
		"users:manage",
	],
}))

jest.mock("@repo/db/schema", () => ({
	permissions: { id: "permissionId", name: "permissionName" },
	rolePermissions: { roleId: "roleId", permissionId: "permissionId" },
	roles: { id: "roleId", name: "roleName" },
	userRoles: { userId: "userId", roleId: "roleId" },
	users: { id: "userId" },
}))

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		delete: jest.fn(),
	},
}))

describe("RbacService", () => {
	it("returns all resolved roles and catalog-ordered permissions from the cached resolved set", async () => {
		const cacheService = {
			get: jest.fn(() => ({
				roleNames: new Set(["User", "Admin", "Owner"]),
				permissionNames: new Set(["users:read", "posts:read", "posts:*", "billing:read"]),
			})),
			set: jest.fn(),
			invalidate: jest.fn(),
		}

		// AZ-4: RbacService now writes an audit entry inside every grant/removal
		// transaction. This test only exercises the read path, so the collaborator
		// is a stub — the in-transaction behaviour is covered in audit.service.spec.
		const auditService = { record: jest.fn(), list: jest.fn() }

		const service = new RbacService(cacheService as never, auditService as never)

		await expect(service.getUserAccess("user-1")).resolves.toEqual({
			roles: ["Admin", "Owner", "User"],
			permissions: ["posts:read", "posts:*", "users:read"],
		})
		expect(cacheService.get).toHaveBeenCalledWith("user-1")
		expect(cacheService.set).not.toHaveBeenCalled()
	})
})
