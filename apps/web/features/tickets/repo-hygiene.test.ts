import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/** HY-2 — F-41, F-52, F-61, F-62. Checked-in artefacts that mislead. */

const root = join(__dirname, "../../../..")
const read = (p: string) => readFileSync(join(root, p), "utf8")

describe("no working credentials in example files (F-41, F-61)", () => {
	it("packages/db/.env.example ships a placeholder, not a real pair", () => {
		const env = read("packages/db/.env.example")
		expect(env).not.toContain("postgres://postgres:password@")
		expect(env).toContain("<password>")
	})

	it("README uses angle brackets, not scanner-tripping key prefixes", () => {
		const readme = read("README.md")
		// `AKIA` and `GOCSPX-` are the literal prefixes secret scanners match on;
		// shipping them as examples produces alerts with nothing behind them.
		expect(readme).not.toContain("`AKIA...`")
		expect(readme).not.toContain("`GOCSPX-...`")
	})
})

describe("dead weight is gone (F-52)", () => {
	it("has no unused root Dockerfile", () => {
		// It built the whole monorepo with dev dependencies and full source into a
		// shipped image, and nothing referenced it. The real ones are per-app.
		expect(existsSync(join(root, "Dockerfile"))).toBe(false)
		expect(existsSync(join(root, "apps/backend/Dockerfile"))).toBe(true)
		expect(existsSync(join(root, "apps/web/Dockerfile"))).toBe(true)
	})
})

describe("submit form is real (F-62)", () => {
	const page = read("apps/web/app/(site)/submit-ticket/page.tsx")

	it("calls the ticket endpoint instead of faking success", () => {
		expect(page).toContain("useSubmitTicketMutation")
		// The trap being removed: a timeout, then an unconditional success message.
		expect(page).not.toContain("setTimeout(resolve, 800)")
		expect(page).not.toContain("Replace the placeholder handler")
	})

	it("reports failure to assistive tech as an alert, not a status", () => {
		expect(page).toContain('role="alert"')
	})

	it("does not read the form off a released synthetic event", () => {
		expect(page).not.toContain("event.currentTarget.reset()")
	})
})

describe("drizzle 1.0 upgrade is tracked (F-53)", () => {
	it("records the deferred upgrade and keeps the pins exact", () => {
		expect(read("docs/UPGRADES.md")).toContain("drizzle-orm / drizzle-kit 1.0")
		// A range on a pre-release is the specific risk the entry warns about.
		expect(read("packages/db/package.json")).toContain('"drizzle-kit": "1.0.0-beta')
		expect(read("pnpm-workspace.yaml")).toContain("drizzle-orm: 1.0.0-beta")
	})
})
