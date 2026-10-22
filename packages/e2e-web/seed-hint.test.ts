import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { seedHintFor } from "./fixtures.ts"

const ADMIN_HINT =
	"The admin comes from `pnpm db:seed`; its password is `E2E_ADMIN_PASSWORD`, or `SEED_ADMIN_PASSWORD` when that is unset. Re-running the seed does not change an existing admin password."
const ORDINARY_USER_HINT =
	"Run `pnpm db:seed:e2e`; it stores this run's password on the pre-verified user."

describe("seedHintFor", () => {
	it("names the admin seed and password variables", () => {
		const hint = seedHintFor("admin")
		assert.equal(hint, ADMIN_HINT)
		assert.equal(hint.includes("pnpm db:seed"), true)
		assert.equal(hint.includes("E2E_ADMIN_PASSWORD"), true)
		assert.equal(hint.includes("SEED_ADMIN_PASSWORD"), true)
		assert.equal(hint.includes("db:seed:e2e"), false)
	})

	it("keeps the ordinary-user seed hint for userA and userB", () => {
		assert.equal(seedHintFor("userA"), ORDINARY_USER_HINT)
		assert.equal(seedHintFor("userB"), ORDINARY_USER_HINT)
	})
})
