import {
	Global,
	Inject,
	Module,
	type OnApplicationShutdown,
	type OnModuleInit,
} from "@nestjs/common"

import { setAuthRateLimitStorage } from "@repo/auth/rate-limit-storage"

import { createRedisAuthRateLimitStorage } from "./auth-rate-limit.storage"
import { createRedisClient, REDIS_CLIENT, type RedisClient } from "./redis.provider"

/**
 * How long boot will wait for a configured Redis to finish its handshake.
 *
 * The client connects in the background and refuses to queue commands while
 * disconnected. A request that arrives in that window is rejected, and the
 * throttler would treat a healthy server as an outage. Waiting here covers
 * the handshake. A server that never becomes ready must not block boot: the
 * throttler still fails open, and the real outage is logged once.
 */
const REDIS_READY_WAIT_MS = 1_000

/**
 * Shared Redis connection.
 *
 * Global because unrelated subsystems need the same connection (the
 * throttler store, the RBAC permission cache, and Better Auth's own rate
 * limiter) and opening one client per consumer would multiply the connection
 * count for no benefit.
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
export class RedisModule implements OnModuleInit, OnApplicationShutdown {
	constructor(@Inject(REDIS_CLIENT) private readonly client: RedisClient) {}

	async onModuleInit(): Promise<void> {
		const client = this.client
		if (!client) return

		// Better Auth's limiter runs outside Nest, so it cannot inject this
		// client; it is handed over here instead. Registered before the ready
		// wait and whatever the status: the storage fails open, so a slow
		// handshake must not leave Better Auth counting per process for good.
		setAuthRateLimitStorage(createRedisAuthRateLimitStorage(client))

		if (client.status === "ready" || client.status === "end") return

		await new Promise<void>(resolve => {
			let settled = false
			const finish = () => {
				if (settled) return
				settled = true
				clearTimeout(timer)
				client.off("ready", finish)
				client.off("end", finish)
				resolve()
			}
			const timer = setTimeout(finish, REDIS_READY_WAIT_MS)
			client.once("ready", finish)
			client.once("end", finish)
			if (client.status === "ready" || client.status === "end") finish()
		})
	}

	/**
	 * Close the connection after the HTTP server has stopped accepting
	 * requests (`onApplicationShutdown` runs after the server dispose), so a
	 * request still in the throttler can finish. `disconnect()` is only the
	 * fallback for a `quit()` that could not be written — that path otherwise
	 * leaves the reconnect timer running.
	 */
	async onApplicationShutdown(): Promise<void> {
		// Back to the process-local store before the connection closes, so no
		// auth request is sent to a client that is shutting down.
		setAuthRateLimitStorage(null)

		const client = this.client
		if (!client || client.status === "end") return

		try {
			await client.quit()
		} catch {
			client.disconnect()
		}
	}
}
