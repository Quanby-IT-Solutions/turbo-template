import {
	E2eAdminPasswordError,
	resolveE2eAdminEmail,
	resolveE2eAdminPassword,
	SEEDED_ADMIN_EMAIL,
} from "../../test/e2e-admin-password"

describe("resolveE2eAdminPassword", () => {
	it("uses SEED_ADMIN_PASSWORD from the seed env, trimmed", () => {
		expect(resolveE2eAdminPassword({ SEED_ADMIN_PASSWORD: "  seed-source  " })).toBe("seed-source")
	})

	it("honours a non-blank E2E_ADMIN_PASSWORD as an explicit override", () => {
		expect(
			resolveE2eAdminPassword({
				E2E_ADMIN_PASSWORD: "  e2e-override  ",
				SEED_ADMIN_PASSWORD: "seed-source",
			})
		).toBe("e2e-override")
	})

	it("ignores a blank override and falls through to the seed password", () => {
		expect(
			resolveE2eAdminPassword({
				E2E_ADMIN_PASSWORD: "   ",
				SEED_ADMIN_PASSWORD: "seed-source",
			})
		).toBe("seed-source")
	})

	it("fails fast, with what to set and where, when neither password is available", () => {
		expect(() => resolveE2eAdminPassword({})).toThrow(E2eAdminPasswordError)
		expect(() =>
			resolveE2eAdminPassword({ E2E_ADMIN_PASSWORD: "  ", SEED_ADMIN_PASSWORD: "" })
		).toThrow(/SEED_ADMIN_PASSWORD/)

		try {
			resolveE2eAdminPassword({})
			throw new Error("expected the resolver to throw")
		} catch (error) {
			expect(error).toBeInstanceOf(E2eAdminPasswordError)
			const message = (error as Error).message
			expect(message).toContain("packages/db/.env")
			expect(message).toContain("pnpm db:seed")
			expect(message).toContain("E2E_ADMIN_PASSWORD")
			expect(message).toContain("--force-password")
			expect(message).not.toContain("Password123")
		}
	})
})

describe("resolveE2eAdminEmail", () => {
	it("defaults to the seeded admin address", () => {
		expect(resolveE2eAdminEmail({})).toBe(SEEDED_ADMIN_EMAIL)
	})

	it("honours E2E_ADMIN_EMAIL when it is set", () => {
		expect(resolveE2eAdminEmail({ E2E_ADMIN_EMAIL: " other@example.com " })).toBe(
			"other@example.com"
		)
	})
})
