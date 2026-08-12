import { ForbiddenException, Logger, type ExecutionContext } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Test, type TestingModule } from "@nestjs/testing"

import { RbacService } from "@/common/rbac/rbac.service"
import { REQUIRED_PERMISSIONS_KEY } from "@/shared/decorators/require-permissions.decorator"
import { RbacGuard } from "@/shared/guards/rbac.guard"

import { TicketsController } from "./tickets.controller"

// AZ-3 threaded the session into `submitTicket` so submissions are attributed.
// `@thallesp/nestjs-better-auth` ships ESM that this jest config does not
// transform, so the decorator is stubbed exactly as in the todos controller spec.
jest.mock("@thallesp/nestjs-better-auth", () => ({
	AllowAnonymous: () => () => undefined,
	Session: () => () => ({ user: { id: "template-user-id" } }),
}))

// AZ-1: tickets.list / tickets.get must be gated on `users:read` — any
// self-registered user must NOT be able to read reporter PII. This suite
// proves the wiring (decorator present) AND the runtime outcome (permitted
// caller succeeds, unpermitted caller gets 403) by driving the REAL
// RbacGuard against the REAL TicketsController metadata, only RbacService's
// DB-backed permission resolution is stubbed.

jest.mock("@orpc/nest", () => ({
	Implement: () => () => undefined,
}))

jest.mock("@orpc/server", () => ({
	implement: jest.fn(() => ({
		handler: jest.fn((fn: unknown) => fn),
	})),
}))

jest.mock("@/config/api-versions.config", () => ({
	v1: { ticket: { list: {}, get: {}, submit: {} } },
}))

jest.mock("@/config/env.config", () => ({
	env: { NODE_ENV: "development" },
}))

// TicketsService (imported transitively by the controller) opens a real Drizzle
// pool at module load; stub the client so importing the controller is side-effect free.
jest.mock("@/common/database/database.client", () => ({
	db: { select: jest.fn(), insert: jest.fn() },
}))

// RbacService pulls the ESM-only @repo/contracts graph; the suite only needs it
// as a DI token, so stub it the same way rbac.guard.spec.ts does.
jest.mock("@/common/rbac/rbac.service", () => ({
	RbacService: jest.fn().mockImplementation(() => ({
		hasAllPermissions: jest.fn(),
		getMissingPermissions: jest.fn(),
	})),
}))

// ESM auth modules — stubbed so the guard's header-based session fallback is
// deterministic (resolves no session unless the request already carries one).
jest.mock("better-auth/node", () => ({
	fromNodeHeaders: jest.fn(() => ({})),
}))
jest.mock("@repo/auth", () => ({
	getAuth: jest.fn(() => ({ api: { getSession: jest.fn().mockResolvedValue(null) } })),
}))

const buildContext = (
	handler: (...args: never[]) => unknown,
	request: { headers: Record<string, string>; session?: { user?: { id?: string } } }
): ExecutionContext =>
	({
		getHandler: () => handler,
		getClass: () => TicketsController,
		switchToHttp: () => ({ getRequest: () => request }),
	}) as unknown as ExecutionContext

describe("TicketsController RBAC gating (AZ-1)", () => {
	let guard: RbacGuard
	let rbacService: { hasAllPermissions: jest.Mock; getMissingPermissions: jest.Mock }
	let warn: jest.SpyInstance
	const reflector = new Reflector()

	beforeEach(async () => {
		// The guard audits denials through the Nest logger; capture it so the
		// audit trail is asserted rather than printed as test noise.
		warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)

		const app: TestingModule = await Test.createTestingModule({
			providers: [RbacGuard, Reflector, RbacService],
		})
			.overrideProvider(RbacService)
			.useValue({
				hasAllPermissions: jest.fn(),
				getMissingPermissions: jest.fn(),
			})
			.compile()

		guard = app.get(RbacGuard)
		rbacService = app.get(RbacService) as unknown as typeof rbacService
	})

	afterEach(() => {
		warn.mockRestore()
	})

	it.each([
		["listTickets", TicketsController.prototype.listTickets],
		["getTicket", TicketsController.prototype.getTicket],
	] as const)("%s carries the users:read permission requirement", (_name, handler) => {
		expect(reflector.get(REQUIRED_PERMISSIONS_KEY, handler)).toEqual(["users:read"])
	})

	it.each([
		["listTickets", TicketsController.prototype.listTickets],
		["getTicket", TicketsController.prototype.getTicket],
	] as const)("%s allows a caller holding users:read", async (_name, handler) => {
		rbacService.hasAllPermissions.mockResolvedValue(true)

		await expect(
			guard.canActivate(
				buildContext(handler, { headers: {}, session: { user: { id: "staff-1" } } })
			)
		).resolves.toBe(true)
		expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("staff-1", ["users:read"])
	})

	it.each([
		["listTickets", TicketsController.prototype.listTickets],
		["getTicket", TicketsController.prototype.getTicket],
	] as const)(
		"%s denies an authenticated caller lacking users:read with 403",
		async (_name, handler) => {
			rbacService.hasAllPermissions.mockResolvedValue(false)
			rbacService.getMissingPermissions.mockResolvedValue(["users:read"])

			await expect(
				guard.canActivate(
					buildContext(handler, { headers: {}, session: { user: { id: "registrant-1" } } })
				)
			).rejects.toBeInstanceOf(ForbiddenException)
			expect(rbacService.hasAllPermissions).toHaveBeenCalledWith("registrant-1", ["users:read"])
		}
	)

	it.each([
		["listTickets", TicketsController.prototype.listTickets],
		["getTicket", TicketsController.prototype.getTicket],
	] as const)("%s records an auditable denial when access is refused", async (name, handler) => {
		rbacService.hasAllPermissions.mockResolvedValue(false)
		rbacService.getMissingPermissions.mockResolvedValue(["users:read"])

		await expect(
			guard.canActivate(
				buildContext(handler, { headers: {}, session: { user: { id: "registrant-1" } } })
			)
		).rejects.toBeInstanceOf(ForbiddenException)

		expect(warn).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "rbac.permission_denied",
				actorId: "registrant-1",
				action: `TicketsController.${name}`,
				requiredPermissions: ["users:read"],
				missingPermissions: ["users:read"],
			})
		)
	})

	it("does not audit a permitted read", async () => {
		rbacService.hasAllPermissions.mockResolvedValue(true)

		await guard.canActivate(
			buildContext(TicketsController.prototype.listTickets, {
				headers: {},
				session: { user: { id: "staff-1" } },
			})
		)

		expect(warn).not.toHaveBeenCalled()
	})

	it("submit is unaffected — remains callable without a permission requirement", () => {
		// AZ-1 is scoped to reads only; ticket.submit stays anonymous (out of scope).
		expect(
			reflector.get(REQUIRED_PERMISSIONS_KEY, TicketsController.prototype.submitTicket)
		).toBeUndefined()
	})
})
