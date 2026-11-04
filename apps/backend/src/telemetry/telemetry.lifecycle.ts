import { Injectable, type OnApplicationShutdown } from "@nestjs/common"

import { telemetry } from "@/telemetry"

/**
 * Flushes queued spans and metrics when the app shuts down.
 *
 * Runs inside `app.close()`, which the graceful-shutdown handler in
 * `app.config.ts` calls on SIGTERM and SIGINT before exiting.
 */
@Injectable()
export class TelemetryLifecycle implements OnApplicationShutdown {
	async onApplicationShutdown(): Promise<void> {
		await telemetry?.shutdown()
	}
}
