import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common"
import { type Reflector } from "@nestjs/core"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { resolveRequestSession, type RequestWithSession } from "./resolve-request-session"
import { SessionAuthGuard } from "./session-auth.guard"

const mockGetSession = jest.fn()
const mockGetActiveMemberRole = jest.fn()
const mockUserHasPermission = jest.fn()
const mockHasPermission = jest.fn()

jest.mock("better-auth/node", () => ({
	fromNodeHeaders: jest.fn((headers: unknown) => headers),
}))

jest.mock("@repo/auth", () => ({
	getAuth: jest.fn(() => ({
		api: {
			getSession: (...args: unknown[]) => mockGetSession(...args),
			getActiveMemberRole: (...args: unknown[]) => mockGetActiveMemberRole(...args),
			userHasPermission: (...args: unknown[]) => mockUserHasPermission(...args),
			hasPermission: (...args: unknown[]) => mockHasPermission(...args),
		},
	})),
}))

const buildContext = (
	request: RequestWithSession,
	type: "http" | "graphql" | "ws" = "http"
): ExecutionContext =>
	({
		getType: () => type,
		getHandler: () => () => undefined,
		getClass: () => class {},
		switchToHttp: () => ({
			getRequest: () => request,
		}),
	}) as unknown as ExecutionContext

const reflectorFor = (metadata: Record<string, unknown>): Reflector =>
	({
		getAllAndOverride: (key: string) => metadata[key],
	}) as unknown as Reflector

describe("SessionAuthGuard", () => {
	beforeEach(() => {
		mockGetSession.mockReset()
		mockGetActiveMemberRole.mockReset()
		mockUserHasPermission.mockReset()
		mockHasPermission.mockReset()
	})

	it("reuses a session that was already resolved", async () => {
		const request: RequestWithSession = {
			headers: { cookie: "better-auth.session_token=present" },
			session: { user: { id: "user-a", role: "admin" } },
			sessionResolved: true,
		}
		const guard = new SessionAuthGuard(reflectorFor({}))

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true)

		expect(mockGetSession).not.toHaveBeenCalled()
		expect(request.user).toEqual({ id: "user-a", role: "admin" })
	})

	it("does not look up again when the resolved answer is no session", async () => {
		const request: RequestWithSession = {
			headers: { cookie: "better-auth.session_token=forged" },
			session: null,
			sessionResolved: true,
		}
		const guard = new SessionAuthGuard(reflectorFor({}))

		await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
			UnauthorizedException
		)
		expect(mockGetSession).not.toHaveBeenCalled()
	})

	it("looks the session up once and stores it when nothing is resolved yet", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-a" }, session: { id: "sess-a" } })
		const request: RequestWithSession = { headers: { cookie: "better-auth.session_token=present" } }
		const guard = new SessionAuthGuard(reflectorFor({}))

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true)

		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(request.sessionResolved).toBe(true)
		expect(request.session?.user?.id).toBe("user-a")
		expect(request.user?.id).toBe("user-a")
	})

	it("returns the library unauthorized shape when no session verifies", async () => {
		mockGetSession.mockResolvedValue(null)
		const guard = new SessionAuthGuard(reflectorFor({}))

		try {
			await guard.canActivate(buildContext({ headers: {} }))
			fail("expected UnauthorizedException")
		} catch (error) {
			expect(error).toBeInstanceOf(UnauthorizedException)
			expect((error as UnauthorizedException).getResponse()).toEqual({
				code: "UNAUTHORIZED",
				message: "Unauthorized",
			})
		}
	})

	it("allows an anonymous request on a public route and still records the lookup", async () => {
		mockGetSession.mockResolvedValue(null)
		const request: RequestWithSession = { headers: {} }
		const guard = new SessionAuthGuard(reflectorFor({ PUBLIC: true }))

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(request.sessionResolved).toBe(true)
		expect(request.session).toBeNull()
		expect(request.user).toBeNull()
	})

	it("allows an anonymous request on an optional-auth route", async () => {
		mockGetSession.mockResolvedValue(null)
		const guard = new SessionAuthGuard(reflectorFor({ OPTIONAL: true }))

		await expect(guard.canActivate(buildContext({ headers: {} }))).resolves.toBe(true)
	})

	it("rejects a signed-in user who lacks a required role", async () => {
		const request: RequestWithSession = {
			session: { user: { id: "user-a", role: "user" } },
			sessionResolved: true,
		}
		const guard = new SessionAuthGuard(reflectorFor({ ROLES: ["admin"] }))

		try {
			await guard.canActivate(buildContext(request))
			fail("expected ForbiddenException")
		} catch (error) {
			expect(error).toBeInstanceOf(ForbiddenException)
			expect((error as ForbiddenException).getResponse()).toEqual({
				code: "FORBIDDEN",
				message: "Insufficient permissions",
			})
		}
		expect(mockGetSession).not.toHaveBeenCalled()
	})

	it("accepts a comma-separated role that includes a required role", async () => {
		const request: RequestWithSession = {
			session: { user: { id: "user-a", role: "editor, admin" } },
			sessionResolved: true,
		}
		const guard = new SessionAuthGuard(reflectorFor({ ROLES: ["admin"] }))

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true)
	})

	it("rejects an organization role when the session has no active organization", async () => {
		const request: RequestWithSession = {
			session: { user: { id: "user-a", role: "admin" }, session: {} },
			sessionResolved: true,
		}
		const guard = new SessionAuthGuard(reflectorFor({ ORG_ROLES: ["owner"] }))

		await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
			ForbiddenException
		)
		expect(mockGetActiveMemberRole).not.toHaveBeenCalled()
	})

	it("accepts an organization role reported for the active organization", async () => {
		mockGetActiveMemberRole.mockResolvedValue({ role: "owner" })
		const request: RequestWithSession = {
			session: {
				user: { id: "user-a" },
				session: { activeOrganizationId: "org-1" },
			},
			sessionResolved: true,
		}
		const guard = new SessionAuthGuard(reflectorFor({ ORG_ROLES: ["owner"] }))

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true)
		expect(mockGetActiveMemberRole).toHaveBeenCalledTimes(1)
	})

	it("uses the user permission check and rejects when it does not succeed", async () => {
		mockUserHasPermission.mockResolvedValue({ success: false })
		const request: RequestWithSession = {
			session: { user: { id: "user-a" } },
			sessionResolved: true,
		}
		const guard = new SessionAuthGuard(
			reflectorFor({ USER_HAS_PERMISSION: { permission: { project: ["read"] } } })
		)

		await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
			ForbiddenException
		)
		expect(mockUserHasPermission).toHaveBeenCalledWith(
			expect.objectContaining({
				body: { userId: "user-a", permissions: { project: ["read"] } },
			})
		)
	})

	it("rejects a member permission check when the API denies it", async () => {
		mockHasPermission.mockResolvedValue({ success: false })
		const request: RequestWithSession = {
			session: { user: { id: "user-a" }, session: { activeOrganizationId: "org-1" } },
			sessionResolved: true,
		}
		const guard = new SessionAuthGuard(
			reflectorFor({ MEMBER_HAS_PERMISSION: { permissions: { project: ["delete"] } } })
		)

		await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
			ForbiddenException
		)
	})

	it("rejects a non-HTTP context", async () => {
		const guard = new SessionAuthGuard(reflectorFor({}))

		await expect(guard.canActivate(buildContext({}, "graphql"))).rejects.toBeInstanceOf(
			UnauthorizedException
		)
		expect(mockGetSession).not.toHaveBeenCalled()
	})

	it("does not record a lookup that throws", async () => {
		mockGetSession.mockRejectedValueOnce(new Error("database unavailable"))
		const request: RequestWithSession = { headers: {} }
		const guard = new SessionAuthGuard(reflectorFor({}))

		await expect(guard.canActivate(buildContext(request))).rejects.toThrow("database unavailable")
		expect(request.sessionResolved).toBeUndefined()

		mockGetSession.mockResolvedValueOnce(null)
		await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
			UnauthorizedException
		)
		expect(mockGetSession).toHaveBeenCalledTimes(2)
	})

	it("shares one lookup across the helper and the auth guard", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-a" } })
		const request: RequestWithSession = { headers: { cookie: "present" } }

		await resolveRequestSession(request)
		const guard = new SessionAuthGuard(reflectorFor({}))
		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true)

		expect(mockGetSession).toHaveBeenCalledTimes(1)
	})
})

describe("session resolution wiring", () => {
	const backendRoot = join(__dirname, "../../..")
	const repoRoot = join(backendRoot, "../..")

	it("keeps auth last and leaves the library guard disabled", () => {
		const source = readFileSync(join(backendRoot, "src/app.module.ts"), "utf8")
		const throttler = source.indexOf("useClass: ThrottlerProxyGuard")
		const rbac = source.indexOf("useClass: RbacGuard")
		const auth = source.indexOf("useClass: SessionAuthGuard")

		expect(throttler).toBeGreaterThan(-1)
		expect(rbac).toBeGreaterThan(throttler)
		expect(auth).toBeGreaterThan(rbac)
		expect(source).toContain("disableGlobalAuthGuard: true")
	})

	it("keeps the session cookie cache disabled", () => {
		const source = readFileSync(join(repoRoot, "packages/auth/src/config.ts"), "utf8")
		expect(source).toContain("cookieCache: { enabled: false }")
	})

	it("does not change the auth library version", () => {
		const source = readFileSync(join(backendRoot, "package.json"), "utf8")
		expect(source).toContain('"@thallesp/nestjs-better-auth": "2.5.4"')
	})
})
