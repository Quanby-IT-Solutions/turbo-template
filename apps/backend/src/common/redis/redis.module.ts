import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common"

import { createRedisClient, REDIS_CLIENT, type RedisClient } from "./redis.provider"

/**
 * Shared Redis connection (AB-2).
 *
 * Global because two unrelated subsystems need the same connection — the
 * throttler store and the RBAC permission cache — and opening one client per
 * consumer would double the connection count for no benefit.
 */
@Global()
@Module({
	providers: [
		{
			provide: REDIS_CLIENT,
			useFactory: createRedisClient,
		},
	],
	exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
	constructor(@Inject(REDIS_CLIENT) private readonly client: RedisClient) {}

	/** Close the connection so the process can exit cleanly. */
	async onApplicationShutdown(): Promise<void> {
		await this.client?.quit().catch(() => {
			// Already gone; nothing to close.
		})
	}
}
