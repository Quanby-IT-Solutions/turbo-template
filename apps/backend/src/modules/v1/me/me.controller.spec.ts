import { UnauthorizedException } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"

import { RbacService } from "@/common/rbac/rbac.service"

import { MeController } from "./me.controller"

jest.mock("@orpc/nest", () => ({
	Implement: () => () => undefined,
}))

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
	ROLE_NAMES: ["Admin", "Manager", "User"],
}))

jest.mock("@/common/rbac/rbac.service", () => ({
	RbacService: jest.fn(),
}))

jest.mock("@orpc/server", () => ({
	implement: jest.fn(() => ({
		handler: jest.fn((fn: () => unknown) => fn()),
	})),
}))

jest.mock("@/config/api-versions.config", () => ({
	v1: {
		me: {
			permissions: {},
		},
	},
}))

jest.mock("@thallesp/nestjs-better-auth", () => ({
	Session: () => () => undefined,
}))

describe("MeController", () => {
	let controller: MeController
	let rbacService: { getUserAccess: jest.Mock }

	beforeEach(async () => {
		rbacService = {
			getUserAccess: jest.fn(),
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [MeController],
			providers: [{ provide: RbacService, useValue: rbacService }],
		}).compile()

		controller = module.get(MeController)
	})

	it("returns the current user's roles and permissions", async () => {
		rbacService.getUserAccess.mockResolvedValue({
			roles: ["User"],
			permissions: ["posts:read"],
		})

		await expect(
			controller.getPermissions({ user: { id: "user-1" } } as never)
		).resolves.toEqual({
			roles: ["User"],
			permissions: ["posts:read"],
		})
		expect(rbacService.getUserAccess).toHaveBeenCalledWith("user-1")
	})

	it("throws UnauthorizedException if the session is missing", async () => {
		await expect(controller.getPermissions(undefined)).rejects.toBeInstanceOf(
			UnauthorizedException
		)
		expect(rbacService.getUserAccess).not.toHaveBeenCalled()
	})
})
