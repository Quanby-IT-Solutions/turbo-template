import { getTableName, type SQL } from "drizzle-orm"
import type { PgTable } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"

import { deleteOrphanedUserRows, type OrphanedRowsDatabase } from "./orphaned-user-rows.js"
import { idempotencyKeys, verifications } from "./schema.js"

// A user delete relies on FK cascades for most tables. These two have no FK,
// so if this function stops issuing their deletes the rows survive the account
// and nothing else in the system notices.

interface RecordedDelete {
	table: string
	columns: string[]
	values: unknown[]
}

/**
 * Pulls the column names and bound values out of a Drizzle condition.
 *
 * `eq()` compiles to the chunk sequence [StringChunk, Column, StringChunk,
 * Param, StringChunk]. A Column carries `keyAsName`, which is what separates
 * it from the other two chunk kinds; a Param carries the bound value. Reading
 * the chunks rather than serialising them avoids the circular table reference
 * every Column holds.
 */
function describeCondition(condition: SQL): Pick<RecordedDelete, "columns" | "values"> {
	const chunks = (condition as unknown as { queryChunks: unknown[] }).queryChunks
	const columns: string[] = []
	const values: unknown[] = []

	for (const chunk of chunks) {
		if (chunk === null || typeof chunk !== "object") continue
		if (chunk.constructor?.name === "Param") {
			values.push((chunk as { value: unknown }).value)
		} else if ("keyAsName" in chunk) {
			columns.push(String((chunk as unknown as { name: unknown }).name))
		}
	}

	return { columns, values }
}

function fakeDatabase(): { db: OrphanedRowsDatabase; deletes: RecordedDelete[] } {
	const deletes: RecordedDelete[] = []
	const db: OrphanedRowsDatabase = {
		delete: (table: PgTable) => ({
			where: (condition: SQL) => {
				deletes.push({ table: getTableName(table), ...describeCondition(condition) })
				return Promise.resolve(undefined)
			},
		}),
	}
	return { db, deletes }
}

describe("deleteOrphanedUserRows", () => {
	it("deletes from both tables the cascade cannot reach", async () => {
		const { db, deletes } = fakeDatabase()

		await deleteOrphanedUserRows(db, "user_123")

		expect(deletes.map(d => d.table)).toEqual([
			getTableName(verifications),
			getTableName(idempotencyKeys),
		])
	})

	it("scopes every delete to the user being removed", async () => {
		const { db, deletes } = fakeDatabase()

		await deleteOrphanedUserRows(db, "user_123")

		// An absent or mis-bound predicate deletes the whole table, which is
		// the one mistake in this function that cannot be undone.
		for (const recorded of deletes) {
			expect(recorded.values).toEqual(["user_123"])
		}
	})

	it("matches verifications on value and idempotency keys on author", async () => {
		const { db, deletes } = fakeDatabase()

		await deleteOrphanedUserRows(db, "user_123")

		// `verifications` stores the user id in `value`; `identifier` carries
		// the token. Matching the wrong column silently deletes nothing, which
		// is why the column is asserted and not just the value.
		expect(deletes[0]).toMatchObject({ columns: ["value"] })
		expect(deletes[1]).toMatchObject({ columns: ["author_id"] })
	})

	it("awaits every delete so a failure is not swallowed", async () => {
		const rejecting: OrphanedRowsDatabase = {
			delete: () => ({ where: () => Promise.reject(new Error("db down")) }),
		}

		await expect(deleteOrphanedUserRows(rejecting, "user_123")).rejects.toThrow("db down")
	})
})
