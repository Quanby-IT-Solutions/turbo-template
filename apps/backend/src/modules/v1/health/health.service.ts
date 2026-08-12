import { Injectable, Logger } from "@nestjs/common"
import { sql } from "drizzle-orm"

import { db } from "@/common/database/database.client"
import type { V1Outputs } from "@/config/contract-types"

type HealthCheck = V1Outputs["health"]["check"]

@Injectable()
export class HealthService {
	private readonly logger = new Logger(HealthService.name)

	/**
	 * Liveness for an anonymous caller (LG-2 / F-36).
	 *
	 * The response deliberately carries no build or runtime metadata. It used
	 * to include uptime, version and environment, which tell an unauthenticated
	 * prober when the app last deployed, which published vulnerabilities apply
	 * to this build, and whether they have reached production. None of that
	 * serves a liveness check.
	 *
	 * `status` and `checks.database.status` are unchanged, because the Compose
	 * healthchecks and WC-4's connectivity probe depend on them.
	 */
	async check(): Promise<HealthCheck> {
		const database = await this.checkDatabase()

		return {
			status: database.status === "up" ? "ok" : "error",
			timestamp: new Date().toISOString(),
			checks: { database },
		}
	}

	private async checkDatabase(): Promise<HealthCheck["checks"]["database"]> {
		try {
			await db.execute(sql`select 1`)
			return { status: "up" }
		} catch (error: unknown) {
			// The driver's message names the host, port, database and often the
			// user it tried to connect as. Logged, never returned.
			this.logger.error(
				"Database health check failed",
				error instanceof Error ? error.stack : String(error)
			)
			return { status: "down", message: "database check failed" }
		}
	}
}
