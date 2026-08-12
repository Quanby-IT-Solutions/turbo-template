/**
 * Parse a comma-separated origin allowlist (AC-5 / F-32).
 *
 * Both allowlists in this codebase — Better Auth's `trustedOrigins` and the
 * backend's CORS origins — were split on "," with no trim and no empty filter.
 * A list written with spaces after the commas produced entries like
 * " http://localhost:3001" that match nothing, and a trailing comma produced an
 * empty string, which some origin checks treat as "any". Both fail silently.
 *
 * Lives in its own module, like `secret-schema` and `cookie-domain-schema`, so
 * it is testable without loading the auth config and its env validation.
 */
export function parseOriginList(raw: string | undefined): string[] {
	return (raw ?? "")
		.split(",")
		.map(origin => origin.trim())
		.filter(Boolean)
}
