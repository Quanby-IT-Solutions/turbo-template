import { dbSkipMessage, resolveDbReadiness, type DbExecutor } from "@/testing/db-ready"

function scripted(responses: Array<unknown | Error>): DbExecutor & { calls: number } {
	let calls = 0
	return {
		get calls() {
			return calls
		},
		execute: () => {
			const next = responses[calls]
			calls += 1
			if (next instanceof Error) return Promise.reject(next)
			return Promise.resolve(next)
		},
	}
}

describe("resolveDbReadiness", () => {
	it("keeps the select-1 failure as unreachable and does not ask about relations", async () => {
		const database = scripted([new Error("connect ECONNREFUSED")])

		await expect(resolveDbReadiness(database, ["audit_log"])).resolves.toEqual({
			ready: false,
			connected: false,
			reason: "unreachable",
			missing: [],
		})
		expect(database.calls).toBe(1)
		expect(dbSkipMessage("az-4", "records a grant", "unreachable")).toBe(
			'[az-4] skipped "records a grant": no database reachable'
		)
		expect(dbSkipMessage("az-4", "records a grant", "unreachable")).not.toContain("pnpm db:push")
	})

	it("soft-skips when Postgres answers but a required relation is missing", async () => {
		const database = scripted([[], [{ name: "audit_log" }, { name: "roles" }]])

		await expect(resolveDbReadiness(database, ["audit_log", "roles"])).resolves.toEqual({
			ready: false,
			connected: true,
			reason: "schema",
			missing: ["audit_log", "roles"],
		})
		expect(dbSkipMessage("az-4", "records a grant", "schema", ["audit_log", "roles"])).toContain(
			"pnpm db:push"
		)
	})

	it("runs when every named relation exists", async () => {
		const database = scripted([[], []])

		await expect(resolveDbReadiness(database, ["verifications"])).resolves.toEqual({
			ready: true,
			connected: true,
		})
	})

	it("does not turn a probe error into a skip", async () => {
		const database = scripted([[], new Error("probe sql failed")])

		await expect(resolveDbReadiness(database, ["todos"])).rejects.toThrow("probe sql failed")
	})

	it("refuses a relation name that is not a plain identifier", async () => {
		const database = scripted([])

		await expect(resolveDbReadiness(database, ["audit-log"])).rejects.toThrow(
			/refusing to probe relation name/
		)
		expect(database.calls).toBe(0)
	})
})
