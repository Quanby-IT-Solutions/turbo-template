import { ForbiddenException, type ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Test, type TestingModule } from "@nestjs/testing"

import { RbacService } from "@/common/rbac/rbac.service"

import { RbacGuard } from "./rbac.guard"

jest.mock("@/common/rbac/rbac.service", () => ({
	RbacService: jest.fn().mockImplementation(() => ({
		hasAllPermissions: jest.fn(),
		getMissingPermissions: jest.fn(),
	})),
}))

jest.mock("@/config/env.config", () => ({
	env: { NODE_ENV: "development" },
}))

// better-auth/node and @repo/auth are ESM; mock them so Jest doesn't try to
// parse the real modules and so the guard's session-resolution fallback is
// deterministic (returns no session unless a test overrides it).
const mockGetSession = jest.fn().mockResolvedValue(null)
jest.mock("better-auth/node", () => ({
	fromNodeHeaders: jest.fn(() => ({})),
}))
jest.mock("@repo/auth", () => ({
	getAuth: jest.fn(() => ({ api: { getSession: mockGetSession } })),
}))

const buildContext = (session?: unknown, user?: unknown): ExecutionContext =>
	({
		getHandler: () => () => undefined,
		getClass: () => class {},
		switchToHttp: () => ({
			getRequest: () => ({ session, user }),
		}),
	}) as unknown as ExecutionContext

// Verified request shapes (source: @thallesp/nestjs-better-auth v2.2.0 README,
// "Request Object Access"). The auth middleware attaches both of these after a
// session resolves:
//   - request.session → full UserSession ({ user: { id, ... }, session: { ... } })
//   - request.user    → direct reference to request.session.user
// The guard prefers request.session?.user?.id (matches the @Session() decorator
// shape used in controllers) and falls back to request.user?.id.
describe("RbacGuard", () => {
	let guard: RbacGuard
	let reflector: { getAllAndOverride: jest.Mock }
	let rbacService: { hasAllPermissions: jest.Mock; getMissingPermissions: jest.Mock }
	const env = require("@/config/env.config").env as { NODE_ENV: string }

	beforeEach(async () => {
		env.NODE_ENV = "development"
		mockGetSession.mockReset()
		mockGetSession.mockResolvedValue(null)

		const app: TestingModule = await Test.createTestingModule({
			providers: [RbacGuard, Reflector, RbacService],
		})
			.overrideProvider(Reflector)
			.useValue({ getAllAndOverride: jest.fn() })
			.compile()

		guard = app.get(RbacGuard)
		reflector = app.get(Reflector) as unknown as { getAllAndOverride: jest.Mock }
		rbacService = app.get(RbacService) as unknown as {
			hasAllPermissions: jest.Mock
			getMissingPermissions: jest.Mock
		}
	})

	it("allows when no metadata present (no-op)", async () => {
		reflector.getAllAndOverride.mockReturnValue(undefined)

		await expect(guard.canActivate(buildContext())).resolves.toBe(true)
		expect(rbacService.hasAllPermissions).not.toHaveBeenCalled()
	})

	it("allows when permissions array is empty (no-op)", async () => {
		reflector.getAllAndOverride.mockReturnValue([])

		await expect(guard.canActivate(buildContext())).resolves.toBe(true)
		expect(rbacService.hasAllPermissions).not.toHaveBeenCalled()
	})

	it("throws UnauthorizedException when no session on protected route", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])

		await expect(guard.canActivate(buildContext(undefined))).rejects.toBeInstanceOf(
			UnauthorizedException
		)
		expect(rbacService.hasAllPermissions).not.toHaveBeenCalled()
	})

	it("throws UnauthorizedException when session is absent and user is absent", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])

		await expect(
			guard.canActivate(buildContext(undefined, undefined))
		).rejects.toBeInstanceOf(UnauthorizedException)
		expect(rbacService.hasAllPermissions).not.toHaveBeenCalled()
	})

	it("throws ForbiddenException when user id is on req.user (no req.session)", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(false)

		await expect(
			guard.canActivate(buildContext(undefined, { id: "u1" }))
		).rejects.toBeInstanceOf(ForbiddenException)
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("u1", ["posts:create"])
	})

	it("allows when user id is on req.user and has permission", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(true)

		await expect(
			guard.canActivate(buildContext(undefined, { id: "u1" }))
		).resolves.toBe(true)
	})

	it("prefers req.session.user.id over req.user.id when both present", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(true)

		await expect(
			guard.canActivate(buildContext({ user: { id: "session-u" } }, { id: "user-u" }))
		).resolves.toBe(true)
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("session-u", ["posts:create"])
	})

	it("throws ForbiddenException when authenticated but missing permission", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(false)

		await expect(
			guard.canActivate(buildContext({ user: { id: "u1" } }))
		).rejects.toBeInstanceOf(ForbiddenException)
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("u1", ["posts:create"])
	})

	it("allows when authenticated and has permission", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(true)

		await expect(guard.canActivate(buildContext({ user: { id: "u1" } }))).resolves.toBe(true)
	})

	it("resolves the session itself when not yet attached to the request", async () => {
		// Simulates RbacGuard running before the better-auth AuthGuard: no session
		// on the request, but getSession resolves one from the headers.
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(true)
		mockGetSession.mockResolvedValue({ user: { id: "resolved-u" } })

		await expect(guard.canActivate(buildContext(undefined, undefined))).resolves.toBe(true)
		expect(mockGetSession).toHaveBeenCalled()
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("resolved-u", ["posts:create"])
	})

	it("includes missingPermissions in non-production 403 response", async () => {
		env.NODE_ENV = "development"
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(false)
		rbacService.getMissingPermissions.mockResolvedValue(["posts:create"])

		try {
			await guard.canActivate(buildContext({ user: { id: "u1" } }))
			fail("expected ForbiddenException")
		} catch (error) {
			expect(error).toBeInstanceOf(ForbiddenException)
			const response = (error as ForbiddenException).getResponse()
			expect(response).toMatchObject({
				message: "Forbidden",
				missingPermissions: ["posts:create"],
			})
		}
	})

	it("reports only unmet permissions when some required permissions are satisfied", async () => {
		env.NODE_ENV = "development"
		reflector.getAllAndOverride.mockReturnValue(["posts:create", "posts:delete", "posts:read"])
		rbacService.hasAllPermissions.mockResolvedValue(false)
		// User has posts:create but lacks posts:delete and posts:read.
		rbacService.getMissingPermissions.mockResolvedValue(["posts:delete", "posts:read"])

		try {
			await guard.canActivate(buildContext({ user: { id: "u1" } }))
			fail("expected ForbiddenException")
		} catch (error) {
			expect(error).toBeInstanceOf(ForbiddenException)
			const response = (error as ForbiddenException).getResponse()
			expect(response).toMatchObject({
				message: "Forbidden",
				missingPermissions: ["posts:delete", "posts:read"],
			})
			expect((response as Record<string, unknown>).missingPermissions).not.toContain(
				"posts:create"
			)
			expect(rbacService.getMissingPermissions).toHaveBeenCalledWith("u1", [
				"posts:create",
				"posts:delete",
				"posts:read",
			])
		}
	})

	it("returns generic 403 message in production", async () => {
		env.NODE_ENV = "production"
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(false)

		try {
			await guard.canActivate(buildContext({ user: { id: "u1" } }))
			fail("expected ForbiddenException")
		} catch (error) {
			expect(error).toBeInstanceOf(ForbiddenException)
			const response = (error as ForbiddenException).getResponse()
			expect(response).toMatchObject({ message: "Forbidden" })
			expect((response as Record<string, unknown>).missingPermissions).toBeUndefined()
		}
	})
})
