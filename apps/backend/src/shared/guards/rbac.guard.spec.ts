import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Test, type TestingModule } from "@nestjs/testing"

import { RbacService } from "@/common/rbac/rbac.service"

import { RbacGuard } from "./rbac.guard"
import { resolveRequestSession } from "./resolve-request-session"
import { ThrottlerProxyGuard } from "./throttler-proxy.guard"

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
// parse the real modules. The permission guard reads the user id only from
// resolveRequestSession, so these tests supply that user through getSession.
const mockGetSession = jest.fn().mockResolvedValue(null)
jest.mock("better-auth/node", () => ({
	fromNodeHeaders: jest.fn(() => ({})),
}))
jest.mock("@repo/auth", () => ({
	getAuth: jest.fn(() => ({ api: { getSession: mockGetSession } })),
}))

const buildContext = (
	session?: unknown,
	user?: unknown,
	extra?: Record<string, unknown>
): ExecutionContext =>
	({
		getHandler: () => () => undefined,
		getClass: () => class {},
		switchToHttp: () => ({
			getRequest: () => ({ session, user, ...extra }),
		}),
	}) as unknown as ExecutionContext

const buildStableContext = (request: object): ExecutionContext =>
	({
		getHandler: () => () => undefined,
		getClass: () => class {},
		switchToHttp: () => ({
			getRequest: () => request,
		}),
	}) as unknown as ExecutionContext

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
		expect(mockGetSession).not.toHaveBeenCalled()
	})

	it("allows when permissions array is empty (no-op)", async () => {
		reflector.getAllAndOverride.mockReturnValue([])

		await expect(guard.canActivate(buildContext())).resolves.toBe(true)
		expect(rbacService.hasAllPermissions).not.toHaveBeenCalled()
		expect(mockGetSession).not.toHaveBeenCalled()
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

		await expect(guard.canActivate(buildContext(undefined, undefined))).rejects.toBeInstanceOf(
			UnauthorizedException
		)
		expect(rbacService.hasAllPermissions).not.toHaveBeenCalled()
	})

	it("throws ForbiddenException when the verified lookup supplies the user id", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(false)
		mockGetSession.mockResolvedValue({ user: { id: "u1" } })

		await expect(
			guard.canActivate(buildContext(undefined, { id: "someone-else" }))
		).rejects.toBeInstanceOf(ForbiddenException)
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("u1", ["posts:create"])
	})

	it("allows when the verified lookup supplies a user who has permission", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(true)
		mockGetSession.mockResolvedValue({ user: { id: "u1" } })

		await expect(guard.canActivate(buildContext(undefined, { id: "someone-else" }))).resolves.toBe(
			true
		)
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("u1", ["posts:create"])
	})

	it("checks permissions for the user getSession returns when pre-set objects say otherwise", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(true)
		mockGetSession.mockResolvedValue({ user: { id: "u1" } })
		const request = {
			headers: {},
			session: { user: { id: "session-u" } },
			user: { id: "user-u" },
		}

		await expect(guard.canActivate(buildStableContext(request))).resolves.toBe(true)
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("u1", ["posts:create"])
	})

	it("throws ForbiddenException when authenticated but missing permission", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(false)
		mockGetSession.mockResolvedValue({ user: { id: "u1" } })

		await expect(guard.canActivate(buildContext())).rejects.toBeInstanceOf(ForbiddenException)
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("u1", ["posts:create"])
	})

	it("allows when authenticated and has permission", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(true)
		mockGetSession.mockResolvedValue({ user: { id: "u1" } })

		await expect(guard.canActivate(buildContext())).resolves.toBe(true)
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("u1", ["posts:create"])
	})

	it("does not look the session up again when resolution was already recorded", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		mockGetSession.mockResolvedValue(null)
		const request = { headers: {} }
		await resolveRequestSession(request)
		expect(mockGetSession).toHaveBeenCalledTimes(1)

		await expect(guard.canActivate(buildStableContext(request))).rejects.toBeInstanceOf(
			UnauthorizedException
		)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(rbacService.hasAllPermissions).not.toHaveBeenCalled()
	})

	it("resolves the session itself when not yet attached to the request", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(true)
		mockGetSession.mockResolvedValue({ user: { id: "resolved-u" } })

		await expect(guard.canActivate(buildContext(undefined, undefined))).resolves.toBe(true)
		expect(mockGetSession).toHaveBeenCalled()
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("resolved-u", ["posts:create"])
	})

	it("rejects with the lookup error when a pre-set session is present and getSession throws", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		const lookupError = new Error("database unavailable")
		mockGetSession.mockRejectedValue(lookupError)
		const request = {
			headers: {},
			session: { user: { id: "preset-user" } },
			user: { id: "preset-user" },
		}

		await expect(guard.canActivate(buildStableContext(request))).rejects.toBe(lookupError)
		expect(rbacService.hasAllPermissions).not.toHaveBeenCalled()
	})

	it("returns 401 when getSession returns null for a request that already carries a user id", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		mockGetSession.mockResolvedValue(null)
		const request = {
			headers: {},
			session: { user: { id: "preset-user" } },
			user: { id: "preset-user" },
		}

		await expect(guard.canActivate(buildStableContext(request))).rejects.toBeInstanceOf(
			UnauthorizedException
		)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(rbacService.hasAllPermissions).not.toHaveBeenCalled()
	})

	it("calls getSession again in the permission guard after the throttler lookup threw", async () => {
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(true)
		mockGetSession.mockRejectedValueOnce(new Error("database unavailable"))
		mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } })
		const request = {
			headers: {},
			ips: ["203.0.113.9"],
			ip: "203.0.113.9",
			session: { user: { id: "preset-user" } },
			user: { id: "preset-user" },
		}
		const throttler = Object.create(ThrottlerProxyGuard.prototype) as ThrottlerProxyGuard

		await expect(throttler["getTracker"](request)).resolves.toBe("203.0.113.9")
		expect(mockGetSession).toHaveBeenCalledTimes(1)

		await expect(guard.canActivate(buildStableContext(request))).resolves.toBe(true)
		expect(mockGetSession).toHaveBeenCalledTimes(2)
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("u1", ["posts:create"])
	})

	it("includes missingPermissions in non-production 403 response", async () => {
		env.NODE_ENV = "development"
		reflector.getAllAndOverride.mockReturnValue(["posts:create"])
		rbacService.hasAllPermissions.mockResolvedValue(false)
		rbacService.getMissingPermissions.mockResolvedValue(["posts:create"])
		mockGetSession.mockResolvedValue({ user: { id: "u1" } })

		try {
			await guard.canActivate(buildContext())
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
		rbacService.getMissingPermissions.mockResolvedValue(["posts:delete", "posts:read"])
		mockGetSession.mockResolvedValue({ user: { id: "u1" } })

		try {
			await guard.canActivate(buildContext())
			fail("expected ForbiddenException")
		} catch (error) {
			expect(error).toBeInstanceOf(ForbiddenException)
			const response = (error as ForbiddenException).getResponse()
			expect(response).toMatchObject({
				message: "Forbidden",
				missingPermissions: ["posts:delete", "posts:read"],
			})
			expect((response as Record<string, unknown>).missingPermissions).not.toContain("posts:create")
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
		mockGetSession.mockResolvedValue({ user: { id: "u1" } })

		try {
			await guard.canActivate(buildContext())
			fail("expected ForbiddenException")
		} catch (error) {
			expect(error).toBeInstanceOf(ForbiddenException)
			const response = (error as ForbiddenException).getResponse()
			expect(response).toMatchObject({ message: "Forbidden" })
			expect((response as Record<string, unknown>).missingPermissions).toBeUndefined()
		}
	})
})
