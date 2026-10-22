/**
 * Whether a navigation should be repeated because the session read failed.
 *
 * `/login` as the requested path is never repeated. Landing on `/login`, or
 * showing the session-unavailable screen, is a failed read. A visible Logout
 * control means the session is present.
 */
export function pageShowsFailedSessionRead(input: {
	requestedPath: string
	landedPath: string
	signal: "in" | "out" | "limited" | "unknown"
}): boolean {
	if (input.requestedPath === "/login") return false
	if (input.landedPath === "/login") return true
	if (input.signal === "limited") return true
	return input.signal === "out"
}
