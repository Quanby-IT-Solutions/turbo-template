import { sql, type SQL } from "drizzle-orm"

/**
 * Readiness for specs that hit a real Postgres.
 *
 * `select 1` still means the server is unreachable, and that skip is unchanged.
 * A live server with no `pnpm db:push` answers `select 1` and then fails on the
 * first missing relation. That case skips too, and the message names
 * `pnpm db:push`.
 *
 * Presence is `to_regclass` for the tables the spec names. A table that exists
 * is not a skip: a missing column or a bad row still fails the test.
 */

const RELATION_NAME = /^[a-z_][a-z0-9_]*$/

export type DbSkipReason = "unreachable" | "schema"

export type DbExecutor = {
	execute: (query: SQL) => Promise<unknown>
}

export type DbReadiness =
	| { ready: true; connected: true }
	| { ready: false; connected: false; reason: "unreachable"; missing: readonly [] }
	| { ready: false; connected: true; reason: "schema"; missing: readonly string[] }

export function dbSkipMessage(
	label: string,
	testName: string,
	reason: DbSkipReason,
	missing: readonly string[] = []
): string {
	if (reason === "schema") {
		const listed = missing.length > 0 ? ` (${missing.join(", ")})` : ""
		return `[${label}] skipped "${testName}": Postgres is up but required relations are missing${listed}. Run pnpm db:push.`
	}
	return `[${label}] skipped "${testName}": no database reachable`
}

function missingRelationNames(result: unknown): string[] {
	const rows = Array.isArray(result)
		? result
		: result !== null &&
			  typeof result === "object" &&
			  "rows" in result &&
			  Array.isArray(result.rows)
			? result.rows
			: []

	const names: string[] = []
	for (const row of rows) {
		if (row === null || typeof row !== "object" || !("name" in row)) continue
		const name = row.name
		if (typeof name === "string" && name.length > 0) names.push(name)
	}
	return names
}

export async function resolveDbReadiness(
	database: DbExecutor,
	relations: readonly string[]
): Promise<DbReadiness> {
	for (const name of relations) {
		if (!RELATION_NAME.test(name)) {
			throw new Error(`refusing to probe relation name: ${name}`)
		}
	}

	try {
		await database.execute(sql`select 1`)
	} catch {
		return { ready: false, connected: false, reason: "unreachable", missing: [] }
	}

	if (relations.length === 0) {
		return { ready: true, connected: true }
	}

	const checks = sql.join(
		relations.map(
			name => sql`select ${name}::text as name, to_regclass(${`public.${name}`}) as reg`
		),
		sql` union all `
	)
	const result = await database.execute(
		sql`select name from (${checks}) as required where reg is null`
	)
	const missing = missingRelationNames(result)
	if (missing.length > 0) {
		return { ready: false, connected: true, reason: "schema", missing }
	}
	return { ready: true, connected: true }
}

/**
 * One probe, then the same early-return `itDb` the database specs already use.
 * `ready` stays false until `probe()` says both the server and the relations
 * are there. `connected` is true after `select 1` succeeds, including when the
 * schema is missing, so the caller can still close the pool.
 */
export function bindDbBackedTests(options: {
	label: string
	relations: readonly string[]
	database: DbExecutor
}) {
	let readiness: DbReadiness = {
		ready: false,
		connected: false,
		reason: "unreachable",
		missing: [],
	}

	const itDb: jest.It = ((name: string, fn: jest.ProvidesCallback, timeout?: number) =>
		it(
			name,
			async (...args: unknown[]) => {
				if (!readiness.ready) {
					// stdout, not console.warn: Jest prints warn only with --verbose
					// once several files pass, and this line is the skip notice.
					process.stdout.write(
						`${dbSkipMessage(options.label, name, readiness.reason, readiness.missing)}\n`
					)
					return
				}
				return (fn as (...a: unknown[]) => unknown)(...args)
			},
			timeout
		)) as jest.It

	return {
		get ready() {
			return readiness.ready
		},
		get connected() {
			return readiness.connected
		},
		async probe() {
			readiness = await resolveDbReadiness(options.database, options.relations)
		},
		itDb,
	}
}
