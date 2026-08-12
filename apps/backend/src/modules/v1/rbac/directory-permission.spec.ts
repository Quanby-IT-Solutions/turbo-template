import { readFileSync } from "node:fs"
import { join } from "node:path"

// The catalog is read as source rather than imported: the package index pulls
// an ESM chain (@orpc/*) this jest config does not transform, and a deep import
// has no TypeScript path mapping. The values are what matter here.
const CATALOG = readFileSync(
	join(__dirname, "../../../../../../packages/contracts/src/modules/v1/rbac/rbac.catalog.ts"),
	"utf8"
)
const PERMISSION_NAMES: string[] = Array.from(
	CATALOG.slice(CATALOG.indexOf("PERMISSION_NAMES = ["))
		.slice(0, CATALOG.slice(CATALOG.indexOf("PERMISSION_NAMES = [")).indexOf("] as const"))
		.matchAll(/"([a-z]+:[a-z*-]+)"/g)
).map(match => match[1] as string)

/**
 * AZ-5 / F-51 — directory PII is split from operational reads.
 *
 * `users:read` yielded the complete email directory, so granting someone
 * support-ticket triage (AZ-1, also gated on `users:read`) handed them every
 * address as a side effect.
 */

describe("permission catalog", () => {
	it("carries the finer directory key", () => {
		expect(PERMISSION_NAMES).toContain("users:read-directory")
	})

	it("keeps users:read, so AZ-1's ticket gate is unaffected", () => {
		expect(PERMISSION_NAMES).toContain("users:read")
	})

	it("names the key so the users:* wildcard still covers it", () => {
		// The wildcard convention matches on the segment before the colon, so
		// `users:read-directory` is covered by `users:*` while
		// `users:directory-read` would not have been.
		const directoryKeys = PERMISSION_NAMES.filter((name: string) => name.includes("directory"))
		expect(directoryKeys).toEqual(["users:read-directory"])
		for (const key of directoryKeys) {
			expect(key.startsWith("users:")).toBe(true)
		}
	})
})

describe("directory trimming", () => {
	/** The mapping `listUsers` applies, isolated from the database. */
	const project = (rows: Array<{ id: string; name: string; email: string }>, include: boolean) =>
		rows.map(user => ({
			id: user.id,
			name: user.name,
			email: include ? user.email : "",
			roles: [] as string[],
		}))

	const rows = [
		{ id: "u1", name: "Ada", email: "ada@example.com" },
		{ id: "u2", name: "Grace", email: "grace@example.com" },
	]

	it("returns addresses to a caller holding the directory permission", () => {
		expect(project(rows, true).map(u => u.email)).toEqual(["ada@example.com", "grace@example.com"])
	})

	it("omits every address from a caller without it", () => {
		const result = project(rows, false)
		expect(result.map(u => u.email)).toEqual(["", ""])
		expect(JSON.stringify(result)).not.toContain("@example.com")
	})

	it("still returns the useful part of the list", () => {
		// The design call: omit the PII rather than 403. A 403 would break the
		// user-management screen for triage staff who legitimately need to see
		// who exists and what roles they hold.
		const result = project(rows, false)
		expect(result.map(u => u.name)).toEqual(["Ada", "Grace"])
		expect(result.map(u => u.id)).toEqual(["u1", "u2"])
	})
})
