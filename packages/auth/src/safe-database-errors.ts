import { redactSqlParams } from "@repo/observability"

/**
 * A database error as it may travel on. Drizzle's `DrizzleQueryError` carries
 * the query's bound values in its message and on `.params`, and its pg cause
 * can repeat them in `detail` (`Key (email)=(...) already exists`). The copy
 * keeps the name, the redacted message and stack, and the cause's message only.
 */
export function safeDatabaseError(error: unknown): unknown {
	if (!(error instanceof Error)) return error
	const cause =
		error.cause instanceof Error ? new Error(redactSqlParams(error.cause.message)) : undefined
	const safe = new Error(redactSqlParams(error.message), cause ? { cause } : undefined)
	safe.name = error.name
	if (error.stack) safe.stack = redactSqlParams(error.stack)
	return safe
}

/**
 * The adapter with every method's failure passed through `safeDatabaseError`.
 *
 * Better Auth's router prints any non-API error raw (`# SERVER_ERROR:` in
 * better-call, no option turns it off), and its logger, Sentry's console
 * breadcrumbs and the stack all repeat the message. Measured 11/4 with the
 * database down: a reset-link click printed the live reset token, a sign-in
 * the email. Cleaning the error where it leaves the database covers them all.
 */
export function withSafeDatabaseErrors<T extends object>(adapter: T): T {
	return new Proxy(adapter, {
		get(target, property, receiver) {
			const value: unknown = Reflect.get(target, property, receiver)
			if (typeof value !== "function") return value
			return (...args: unknown[]) => {
				try {
					const result: unknown = value.apply(target, args)
					return result instanceof Promise
						? result.catch((error: unknown) => {
								throw safeDatabaseError(error)
							})
						: result
				} catch (error) {
					throw safeDatabaseError(error)
				}
			}
		},
	})
}
