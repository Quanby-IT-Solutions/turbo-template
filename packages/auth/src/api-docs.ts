/**
 * Whether API docs are enabled.
 *
 * Shared by the backend (Scalar, `spec.json`, `/auth/open-api`) and the
 * Better Auth openAPI plugin so the two cannot drift. `@t3-oss/env-core`
 * cannot express a default that depends on another variable, so callers
 * pass the optional flag in and resolve it here:
 *
 * - an explicit `true` / `false` wins
 * - otherwise docs are on only in development
 * - an unset `nodeEnv` counts as `"development"` (the backend's zod default)
 *
 * This module does not call `createEnv()`, so it can be imported without
 * booting auth validation.
 */
export function isApiDocsEnabled(
	nodeEnv: string | undefined,
	rawFlag: boolean | undefined
): boolean {
	if (rawFlag !== undefined) {
		return rawFlag
	}

	return (nodeEnv ?? "development") === "development"
}
