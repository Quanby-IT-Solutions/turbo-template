import type { PostHog } from "posthog-node"

import { FeatureFlagsService } from "./feature-flags.service"
import { POSTHOG_FLAG_TIMEOUT_MS } from "./posthog.provider"

/** A stand-in client whose `evaluateFlags` resolves however the test says. */
function clientWith(evaluateFlags: jest.Mock): PostHog {
	return { evaluateFlags } as unknown as PostHog
}

function flagsSaying(enabled: boolean) {
	return { isEnabled: (key: string) => (key === "template-preview" ? enabled : false) }
}

describe("FeatureFlagsService", () => {
	afterEach(() => jest.useRealTimers())

	it("reads off when analytics is off (no client)", async () => {
		await expect(new FeatureFlagsService(null).isEnabled("template-preview", "u1")).resolves.toBe(
			false
		)
	})

	it("reads on when PostHog says on, asking only for that flag and that user", async () => {
		const evaluateFlags = jest.fn().mockResolvedValue(flagsSaying(true))

		await expect(
			new FeatureFlagsService(clientWith(evaluateFlags)).isEnabled("template-preview", "u1")
		).resolves.toBe(true)
		expect(evaluateFlags).toHaveBeenCalledWith("u1", { flagKeys: ["template-preview"] })
	})

	it("reads off when PostHog says off", async () => {
		const evaluateFlags = jest.fn().mockResolvedValue(flagsSaying(false))

		await expect(
			new FeatureFlagsService(clientWith(evaluateFlags)).isEnabled("template-preview", "u1")
		).resolves.toBe(false)
	})

	it("reads off when the evaluation fails", async () => {
		const evaluateFlags = jest.fn().mockRejectedValue(new Error("PostHog unreachable"))

		await expect(
			new FeatureFlagsService(clientWith(evaluateFlags)).isEnabled("template-preview", "u1")
		).resolves.toBe(false)
	})

	it("reads off once the timeout passes when PostHog never answers", async () => {
		jest.useFakeTimers()
		const evaluateFlags = jest.fn().mockReturnValue(new Promise(() => {}))

		const result = new FeatureFlagsService(clientWith(evaluateFlags)).isEnabled(
			"template-preview",
			"u1"
		)
		await jest.advanceTimersByTimeAsync(POSTHOG_FLAG_TIMEOUT_MS)

		await expect(result).resolves.toBe(false)
	})
})
