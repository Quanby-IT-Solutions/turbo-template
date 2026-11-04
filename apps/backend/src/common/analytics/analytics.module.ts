import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common"

import { env } from "@/config/env.config"

import { createPosthogClient, POSTHOG_CLIENT, type PosthogClient } from "./posthog.provider"

/**
 * The shared PostHog client.
 *
 * Global so any module can inject `POSTHOG_CLIENT` (or the services built on
 * it) without re-importing this module. One client per process: it batches
 * events, so a second client would double the connections and split batches.
 * Queued events are flushed on shutdown.
 */
@Global()
@Module({
	providers: [
		{
			provide: POSTHOG_CLIENT,
			useFactory: (): PosthogClient =>
				createPosthogClient({
					enabled: env.POSTHOG_ENABLED,
					token: env.POSTHOG_TOKEN,
					host: env.POSTHOG_HOST,
					secretKey: env.POSTHOG_FEATURE_FLAGS_SECRET_KEY,
				}),
		},
	],
	exports: [POSTHOG_CLIENT],
})
export class AnalyticsModule implements OnApplicationShutdown {
	constructor(@Inject(POSTHOG_CLIENT) private readonly client: PosthogClient) {}

	async onApplicationShutdown(): Promise<void> {
		await this.client?.shutdown()
	}
}
