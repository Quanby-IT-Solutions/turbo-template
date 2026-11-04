import { Inject, Injectable, Logger } from "@nestjs/common"

import { POSTHOG_CLIENT, POSTHOG_FLAG_TIMEOUT_MS, type PosthogClient } from "./posthog.provider"

/**
 * Feature flags, read from PostHog.
 *
 * A flag is on only when PostHog positively says so. Analytics off, PostHog
 * down, slow or erroring: all read as off, so a flag can only ever add
 * behaviour and an outage can only take it away. No call waits longer than
 * `POSTHOG_FLAG_TIMEOUT_MS`, which bounds what PostHog can cost a request.
 *
 * Built on `evaluateFlags()`; the older `isFeatureEnabled` and
 * `getFeatureFlag` are deprecated in posthog-node 5.x.
 */
@Injectable()
export class FeatureFlagsService {
	private readonly logger = new Logger(FeatureFlagsService.name)

	/** Flags whose failure was already logged, so an outage logs once per flag. */
	private readonly warned = new Set<string>()

	constructor(@Inject(POSTHOG_CLIENT) private readonly client: PosthogClient) {}

	async isEnabled(key: string, distinctId: string): Promise<boolean> {
		if (!this.client) return false

		let timer: NodeJS.Timeout | undefined
		const timeout = new Promise<"timeout">(resolve => {
			timer = setTimeout(() => resolve("timeout"), POSTHOG_FLAG_TIMEOUT_MS)
		})

		try {
			const result = await Promise.race([
				this.client.evaluateFlags(distinctId, { flagKeys: [key] }),
				timeout,
			])
			if (result === "timeout") {
				this.warnOnce(key, `timed out after ${POSTHOG_FLAG_TIMEOUT_MS} ms`)
				return false
			}
			return result.isEnabled(key) === true
		} catch (error) {
			this.warnOnce(key, error instanceof Error ? error.message : "unknown error")
			return false
		} finally {
			clearTimeout(timer)
		}
	}

	// The distinct id is never logged: it is a user id.
	private warnOnce(key: string, reason: string): void {
		if (this.warned.has(key)) return
		this.warned.add(key)
		this.logger.warn(`Feature flag "${key}" read as off: ${reason}`)
	}
}
