import { like } from "drizzle-orm"

import { verifications } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { ExpiryCleanupService } from "@/common/maintenance/expiry-cleanup.service"
import { bindDbBackedTests } from "@/testing/db-ready"

/**
 * Expired verification tokens are swept.
 *
 * Hits the real database: the whole point is that a DELETE with a timestamp
 * predicate removes the right rows and leaves the rest, which a mocked query
 * builder cannot demonstrate.
 *
 * Skips the database-backed cases when no Postgres is reachable, and when it is
 * up but `pnpm db:push` has not created `verifications`. A table that exists
 * still runs. Without that guard the cases fail on a runner with no database
 * — reporting a broken sweeper when the real state is "could not be checked
 * here", which is the kind of red that gets a suite muted.
 */
describe("ExpiryCleanupService — verifications", () => {
	const service = new ExpiryCleanupService()
	const marker = `hy2-test-${process.pid}`

	const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000)

	const dbTests = bindDbBackedTests({
		label: "hy2",
		relations: ["verifications"],
		database: db,
	})
	const itDb = dbTests.itDb

	beforeAll(async () => {
		await dbTests.probe()
	})

	// Scoped to this run's own rows. A broad "delete everything expired" would
	// also wipe unrelated rows in a shared dev database.
	afterEach(async () => {
		if (!dbTests.ready) return
		await db.delete(verifications).where(like(verifications.identifier, `${marker}%`))
	})

	// The pool otherwise keeps the event loop alive and jest reports that it
	// could not exit after the run. select 1 opens it even when the schema is missing.
	afterAll(async () => {
		if (dbTests.connected) await db.$client.end()
	})

	itDb("deletes rows whose expiry has passed", async () => {
		await db.insert(verifications).values({
			identifier: `${marker}-expired`,
			value: "v1",
			expiresAt: hoursFromNow(-1),
		})

		const removed = await service.sweepVerifications()
		expect(removed).toBeGreaterThanOrEqual(1)

		const left = await db.select().from(verifications)
		expect(left.some(row => row.identifier === `${marker}-expired`)).toBe(false)
	})

	itDb("leaves unexpired rows alone, so live links keep working", async () => {
		// The failure this guards: sweeping by "created before now" instead of
		// "expires before now" would invalidate a token the user is about to click.
		await db.insert(verifications).values({
			identifier: `${marker}-live`,
			value: "v2",
			expiresAt: hoursFromNow(1),
		})

		await service.sweepVerifications()

		const left = await db.select().from(verifications)
		expect(left.some(row => row.identifier === `${marker}-live`)).toBe(true)
	})

	itDb("is idempotent — a second sweep removes nothing new", async () => {
		await db.insert(verifications).values({
			identifier: `${marker}-twice`,
			value: "v3",
			expiresAt: hoursFromNow(-2),
		})

		await service.sweepVerifications()
		expect(await service.sweepVerifications()).toBe(0)
	})

	itDb("logs a count without the identifier or the token", async () => {
		// The identifier is the user's email and the value is a credential until
		// it expires. Neither may reach the log.
		await db.insert(verifications).values({
			identifier: `${marker}-private@example.test`,
			value: "secret-token-value",
			expiresAt: hoursFromNow(-1),
		})

		const lines: string[] = []
		const spy = jest
			.spyOn(service["logger"], "log")
			.mockImplementation(message => void lines.push(String(message)))

		await service.sweepVerifications()
		spy.mockRestore()

		const combined = lines.join(" ")
		expect(combined).not.toContain("private@example.test")
		expect(combined).not.toContain("secret-token-value")
	})

	it("still sweeps the second table when the first one throws", async () => {
		const idem = jest.spyOn(service, "sweepIdempotencyKeys").mockRejectedValue(new Error("boom"))
		const verif = jest.spyOn(service, "sweepVerifications").mockResolvedValue(0)

		// The cron has no caller to report to, so a throw from either half must be
		// contained: `sweep` resolves, and the other half still runs.
		await expect(service.sweep()).resolves.toBeUndefined()
		expect(verif).toHaveBeenCalled()

		idem.mockRestore()
		verif.mockRestore()
	})
})
