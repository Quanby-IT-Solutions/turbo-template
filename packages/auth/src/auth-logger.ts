import type { BetterAuthOptions } from "better-auth"

import { redactSqlParams } from "@repo/observability"

type AuthLogger = NonNullable<BetterAuthOptions["logger"]>

/** Where Better Auth's default logger writes too: error, warn, everything else to log. */
const sink: Pick<Console, "error" | "warn" | "log"> = console

/**
 * A log argument as it may be printed. An error becomes its stack plus its
 * cause's message, with SQL params redacted: printed as an object it would
 * also dump Drizzle's `.params` field, the bound values themselves.
 */
function printable(value: unknown): unknown {
	if (value instanceof Error) {
		const text = redactSqlParams(value.stack ?? `${value.name}: ${value.message}`)
		const cause =
			value.cause instanceof Error ? `\nCaused by: ${redactSqlParams(value.cause.message)}` : ""
		return text + cause
	}
	return typeof value === "string" ? redactSqlParams(value) : value
}

/**
 * Better Auth's logger, printing the default one's line minus the values
 * a failed query bound (`redactSqlParams`). Measured 11/4 with the database
 * down: one reset-link click printed the live reset token, and a sign-in the
 * email, through Better Auth's default logger, which bypasses pino.
 */
export const authLogger: AuthLogger = {
	log: (level, message, ...args) => {
		// The default logger's line, colours aside: `<ISO time> <LEVEL> [Better Auth]: <message>`.
		const line = `${new Date().toISOString()} ${level.toUpperCase()} [Better Auth]: ${redactSqlParams(message)}`
		const write = level === "error" ? sink.error : level === "warn" ? sink.warn : sink.log
		write(line, ...args.map(printable))
	},
}
