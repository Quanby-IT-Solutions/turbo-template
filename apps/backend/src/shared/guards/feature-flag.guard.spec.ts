import { NotFoundException, type ExecutionContext } from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import type { FeatureFlagsService } from "@/common/analytics/feature-flags.service"
import { FEATURE_FLAG_KEY } from "@/shared/decorators/feature-flag.decorator"

import { FeatureFlagGuard } from "./feature-flag.guard"

// better-auth/node and @repo/auth are ESM; mock them so Jest doesn't try to
// parse the real modules (same as rbac.guard.spec.ts). The guard reads the
// user id only from resolveRequestSession, which asks getSession.
const mockGetSession = jest.fn()
jest.mock("better-auth/node", () => ({
	fromNodeHeaders: jest.fn(() => ({})),
}))
jest.mock("@repo/auth", () => ({
	getAuth: jest.fn(() => ({ api: { getSession: mockGetSession } })),
}))

/** An execution context for a handler carrying `flag` (or none) and a signed-in `userId`. */
function contextFor(flag: string | undefined, userId = "u1"): ExecutionContext {
	const handler = () => undefined
	if (flag) Reflect.defineMetadata(FEATURE_FLAG_KEY, flag, handler)
	mockGetSession.mockResolvedValue({ user: { id: userId }, session: {} })
	const request = { headers: {} }

	return {
		getHandler: () => handler,
		getClass: () => class {},
		switchToHttp: () => ({ getRequest: () => request }),
	} as unknown as ExecutionContext
}

function guardWith(isEnabled: jest.Mock): FeatureFlagGuard {
	return new FeatureFlagGuard(new Reflector(), { isEnabled } as unknown as FeatureFlagsService)
}

describe("FeatureFlagGuard", () => {
	it("allows a handler that carries no flag, without asking PostHog", async () => {
		const isEnabled = jest.fn()

		await expect(guardWith(isEnabled).canActivate(contextFor(undefined))).resolves.toBe(true)
		expect(isEnabled).not.toHaveBeenCalled()
	})

	it("allows when the flag is on for the signed-in user", async () => {
		const isEnabled = jest.fn().mockResolvedValue(true)

		await expect(guardWith(isEnabled).canActivate(contextFor("template-preview"))).resolves.toBe(
			true
		)
	})

	it("answers 404 when the flag is off, so a disabled feature looks absent", async () => {
		const isEnabled = jest.fn().mockResolvedValue(false)

		await expect(guardWith(isEnabled).canActivate(contextFor("template-preview"))).rejects.toThrow(
			NotFoundException
		)
	})

	it("evaluates the flag for the session's user id", async () => {
		const isEnabled = jest.fn().mockResolvedValue(true)

		await guardWith(isEnabled).canActivate(contextFor("template-preview", "user-42"))

		expect(isEnabled).toHaveBeenCalledWith("template-preview", "user-42")
	})
})
