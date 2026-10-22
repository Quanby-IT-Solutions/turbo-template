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
	type: "http" | "graphql" | "ws" | "rpc" = "http"
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

/** Caller-supplied marker that used to mean "already resolved". Not a verified answer. */
const staleResolvedMarker = ["session", "Resolved"].join("")

const markStaleResolved = (request: object): void => {
	Object.assign(request, { [staleResolvedMarker]: true })
}

describe("SessionAuthGuard", () => {
	beforeEach(() => {
		mockGetSession.mockReset()
		mockGetActiveMemberRole.mockReset()
		mockUserHasPermission.mockReset()
		mockHasPermission.mockReset()
	})

	it("reuses a session that was already resolved", async () => {
		const verified = { user: { id: "user-a", role: "admin" } }
		mockGetSession.mockResolvedValue(verified)
		const request: RequestWithSession = {
			headers: { cookie: "better-auth.session_token=present" },
		}
		await resolveRequestSession(request)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
		const guard = new SessionAuthGuard(reflectorFor({}))

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true)

		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(request.user).toEqual({ id: "user-a", role: "admin" })
	})

	it("does not look up again when the resolved answer is no session", async () => {
		mockGetSession.mockResolvedValue(null)
		const request: RequestWithSession = {
			headers: { cookie: "better-auth.session_token=forged" },
		}
		await resolveRequestSession(request)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
		const guard = new SessionAuthGuard(reflectorFor({}))

		await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
			UnauthorizedException
		)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
	})

	it("looks the session up once and stores it when nothing is resolved yet", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-a" }, session: { id: "sess-a" } })
		const request: RequestWithSession = { headers: { cookie: "better-auth.session_token=present" } }
		const guard = new SessionAuthGuard(reflectorFor({}))

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true)

		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(request).not.toHaveProperty(staleResolvedMarker)
		expect(request.session?.user?.id).toBe("user-a")
		expect(request.user?.id).toBe("user-a")

		await resolveRequestSession(request)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
	})

	it("does not trust a pre-set session and rejects when the lookup finds none", async () => {
		mockGetSession.mockResolvedValue(null)
		const request: RequestWithSession = {
			headers: {},
			session: { user: { id: "forged" } },
		}
		const guard = new SessionAuthGuard(reflectorFor({}))

		const result = await resolveRequestSession(request)

		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(result).toBeNull()
		expect(request.session).toBeNull()
		expect(request.user).toBeNull()

		try {
			await guard.canActivate(buildContext(request))
			fail("expected UnauthorizedException")
		} catch (error) {
			expect(error).toBeInstanceOf(UnauthorizedException)
			expect((error as UnauthorizedException).getStatus()).toBe(401)
			expect((error as UnauthorizedException).getResponse()).toEqual({
				code: "UNAUTHORIZED",
				message: "Unauthorized",
			})
		}
		expect(mockGetSession).toHaveBeenCalledTimes(1)
	})

	it("replaces a pre-set session with the session from the verified lookup", async () => {
		const verified = { user: { id: "real-user", role: "admin" }, session: { id: "sess-real" } }
		mockGetSession.mockResolvedValue(verified)
		const preset = { user: { id: "forged" } }
		const request: RequestWithSession = {
			headers: { cookie: "present" },
			session: preset,
		}

		const result = await resolveRequestSession(request)

		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(result).toEqual(verified)
		expect(request.session).toEqual(verified)
		expect(request.session).not.toBe(preset)
		expect(request.user).toEqual({ id: "real-user", role: "admin" })
	})

	it("returns the verified session after the request session is overwritten", async () => {
		const verified = { user: { id: "user-a", role: "admin" }, session: { id: "sess-a" } }
		mockGetSession.mockResolvedValue(verified)
		const request: RequestWithSession = {
			headers: { cookie: "better-auth.session_token=present" },
		}

		const first = await resolveRequestSession(request)

		expect(first).toBe(verified)
		expect(mockGetSession).toHaveBeenCalledTimes(1)

		request.session = { user: { id: "other" } }
		request.user = { id: "other" }
		markStaleResolved(request)

		const second = await resolveRequestSession(request)

		expect(second).toBe(verified)
		expect(request.session).toBe(verified)
		expect(request.user).toBe(verified.user)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
	})

	it("looks up a fresh request that already carries a resolved marker and a pre-set session", async () => {
		mockGetSession.mockResolvedValue(null)
		const request: RequestWithSession = {
			headers: {},
			session: { user: { id: "preset-user" } },
		}
		markStaleResolved(request)
		const guard = new SessionAuthGuard(reflectorFor({}))

		await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
			UnauthorizedException
		)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(request.session).toBeNull()
		expect(request.user).toBeNull()
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
		expect(request).not.toHaveProperty(staleResolvedMarker)
		expect(request.session).toBeNull()
		expect(request.user).toBeNull()

		await resolveRequestSession(request)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
	})

	it("allows an anonymous request on an optional-auth route", async () => {
		mockGetSession.mockResolvedValue(null)
		const guard = new SessionAuthGuard(reflectorFor({ OPTIONAL: true }))

		await expect(guard.canActivate(buildContext({ headers: {} }))).resolves.toBe(true)
	})

	it("rejects a signed-in user who lacks a required role", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-a", role: "user" } })
		const request: RequestWithSession = { headers: {} }
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
		expect(mockGetSession).toHaveBeenCalledTimes(1)
	})

	it("accepts a comma-separated role that includes a required role", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-a", role: "editor, admin" } })
		const request: RequestWithSession = { headers: {} }
		const guard = new SessionAuthGuard(reflectorFor({ ROLES: ["admin"] }))

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
	})

	it("rejects an organization role when the session has no active organization", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-a", role: "admin" }, session: {} })
		const request: RequestWithSession = { headers: {} }
		const guard = new SessionAuthGuard(reflectorFor({ ORG_ROLES: ["owner"] }))

		await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
			ForbiddenException
		)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(mockGetActiveMemberRole).not.toHaveBeenCalled()
	})

	it("accepts an organization role reported for the active organization", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "user-a" },
			session: { activeOrganizationId: "org-1" },
		})
		mockGetActiveMemberRole.mockResolvedValue({ role: "owner" })
		const request: RequestWithSession = { headers: {} }
		const guard = new SessionAuthGuard(reflectorFor({ ORG_ROLES: ["owner"] }))

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(mockGetActiveMemberRole).toHaveBeenCalledTimes(1)
	})

	it("uses the user permission check and rejects when it does not succeed", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-a" } })
		mockUserHasPermission.mockResolvedValue({ success: false })
		const request: RequestWithSession = { headers: {} }
		const guard = new SessionAuthGuard(
			reflectorFor({ USER_HAS_PERMISSION: { permission: { project: ["read"] } } })
		)

		await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
			ForbiddenException
		)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
		expect(mockUserHasPermission).toHaveBeenCalledWith(
			expect.objectContaining({
				body: { userId: "user-a", permissions: { project: ["read"] } },
			})
		)
	})

	it("rejects a member permission check when the API denies it", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "user-a" },
			session: { activeOrganizationId: "org-1" },
		})
		mockHasPermission.mockResolvedValue({ success: false })
		const request: RequestWithSession = { headers: {} }
		const guard = new SessionAuthGuard(
			reflectorFor({ MEMBER_HAS_PERMISSION: { permissions: { project: ["delete"] } } })
		)

		await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
			ForbiddenException
		)
		expect(mockGetSession).toHaveBeenCalledTimes(1)
	})

	it("rejects a non-HTTP context with the HTTP 401 object", async () => {
		const guard = new SessionAuthGuard(reflectorFor({}))

		for (const type of ["graphql", "ws", "rpc"] as const) {
			try {
				await guard.canActivate(buildContext({}, type))
				fail(`expected UnauthorizedException for ${type}`)
			} catch (error) {
				expect(error).toBeInstanceOf(UnauthorizedException)
				expect((error as UnauthorizedException).getStatus()).toBe(401)
				expect((error as UnauthorizedException).getResponse()).toEqual({
					code: "UNAUTHORIZED",
					message: "Unauthorized",
				})
			}
		}
		expect(mockGetSession).not.toHaveBeenCalled()
	})

	it("does not record a lookup that throws", async () => {
		mockGetSession.mockRejectedValueOnce(new Error("database unavailable"))
		const request: RequestWithSession = { headers: {} }
		const guard = new SessionAuthGuard(reflectorFor({}))

		await expect(guard.canActivate(buildContext(request))).rejects.toThrow("database unavailable")
		expect(request).not.toHaveProperty(staleResolvedMarker)

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

	it("keeps the verified answer in a non-exported WeakMap", () => {
		const source = readFileSync(join(__dirname, "resolve-request-session.ts"), "utf8")

		expect(source).toContain("const resolved = new WeakMap<object, RequestSession | null>()")
		expect(source).not.toMatch(/export\s+(?:const|let|function|class)\s+resolved\b/)
		expect(source.includes(staleResolvedMarker)).toBe(false)
	})

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
