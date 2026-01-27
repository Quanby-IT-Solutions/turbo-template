import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { schema } from "@repo/db/schema"

import { DB, POOL, type DBType } from "./database-providers"

/**
 * Global NestJS module that provides Drizzle ORM database client and connection pool.
 *
 * This module should be imported once in your root AppModule.
 * It provides:
 * - DB: The Drizzle database client (injectable, required)
 * - POOL: The PostgreSQL connection pool (injectable, required)
 *
 * The connection pool is automatically closed when the module is destroyed.
 *
 * Requires POSTGRES_URL environment variable to be set.
 *
 * @example
 * ```typescript
 * import { DatabaseModule } from "./database/database.module"
 *
 * @Module({
 *   imports: [DatabaseModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
	providers: [
		// Connection pool provider
		{
			provide: POOL,
			useFactory: (): Pool => {
				const connectionString = process.env.POSTGRES_URL
				if (!connectionString) {
					throw new Error("POSTGRES_URL environment variable is required when using DatabaseModule")
				}
				return new Pool({ connectionString })
			},
		},
		// Database client provider
		{
			provide: DB,
			inject: [POOL],
			useFactory: (pool: Pool): DBType => {
				return drizzle(pool, { schema })
			},
		},
	],
	exports: [DB, POOL],
})
export class DBModule implements OnModuleDestroy {
	constructor(@Inject(POOL) private readonly pool: Pool) { }

	async onModuleDestroy(): Promise<void> {
		await this.pool.end()
	}
}
