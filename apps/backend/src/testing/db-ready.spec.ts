import {
	bindSeededCases,
	dbSkipMessage,
	resolveDbReadiness,
	type DbExecutor,
} from "@/testing/db-ready"

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
		expect(dbSkipMessage("az-4", "records a grant", "unreachable")).not.toContain("pnpm db:seed")
	})

	it("soft-skips when Postgres answers but a required relation is missing", async () => {
		const database = scripted([[], [{ name: "audit_log" }, { name: "roles" }]])

		await expect(resolveDbReadiness(database, ["audit_log", "roles"])).resolves.toEqual({
			ready: false,
			connected: true,
			reason: "schema",
			missing: ["audit_log", "roles"],
		})
		const schema = dbSkipMessage("az-4", "records a grant", "schema", ["audit_log", "roles"])
		expect(schema).toContain("pnpm db:push")
		expect(schema).not.toContain("pnpm db:seed")
	})

	it("names pnpm db:seed when seed data is missing and does not call that a missing relation", () => {
		const seed = dbSkipMessage("az-2", "refuses a grant", "seed", ["Admin"])
		expect(seed).toBe(
			'[az-2] skipped "refuses a grant": schema is present but required seed data is missing (Admin). Run pnpm db:seed for full coverage.'
		)
		expect(seed).not.toContain("pnpm db:push")
		expect(seed).not.toContain("relations are missing")
	})

	it("skips only the opted-in case when the seed row is missing", async () => {
		const lines: string[] = []
		const write = jest.spyOn(process.stdout, "write").mockImplementation(chunk => {
			lines.push(String(chunk))
			return true
		})
		try {
			let ran = false
			let pending: Promise<unknown> = Promise.resolve()
			const passthrough = ((_name: string, fn: jest.ProvidesCallback, _timeout?: number) => {
				pending = Promise.resolve((fn as () => unknown)())
			}) as jest.It
			const gate = bindSeededCases({
				label: "az-2",
				rows: ["Admin"],
				itDb: passthrough,
			})
			gate.markMissing()
			gate.itDb("refuses a grant", async () => {
				ran = true
			})
			await pending
			expect(ran).toBe(false)
			expect(gate.missing).toBe(true)
			expect(lines.join("")).toContain("pnpm db:seed")
			expect(lines.join("")).not.toContain("pnpm db:push")
		} finally {
			write.mockRestore()
		}
	})

	it("runs the opted-in case when the seed row is present", async () => {
		const write = jest.spyOn(process.stdout, "write").mockImplementation(() => true)
		try {
			let ran = false
			let pending: Promise<unknown> = Promise.resolve()
			const passthrough = ((_name: string, fn: jest.ProvidesCallback, _timeout?: number) => {
				pending = Promise.resolve((fn as () => unknown)())
			}) as jest.It
			const gate = bindSeededCases({
				label: "az-4",
				rows: ["Admin"],
				itDb: passthrough,
			})
			gate.itDb("records the refusal", async () => {
				ran = true
			})
			await pending
			expect(ran).toBe(true)
			expect(gate.missing).toBe(false)
			expect(write).not.toHaveBeenCalled()
		} finally {
			write.mockRestore()
		}
	})

	it("leaves a schema skip in place when the inner gate does not run the case", () => {
		const lines: string[] = []
		let ran = false
		const schemaGate = ((_name: string, _fn: jest.ProvidesCallback, _timeout?: number) => {
			lines.push("schema")
		}) as jest.It
		const gate = bindSeededCases({
			label: "az-2",
			rows: ["Admin"],
			itDb: schemaGate,
		})
		gate.markMissing()
		gate.itDb("refuses a grant", async () => {
			ran = true
		})
		expect(ran).toBe(false)
		expect(lines).toEqual(["schema"])
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
