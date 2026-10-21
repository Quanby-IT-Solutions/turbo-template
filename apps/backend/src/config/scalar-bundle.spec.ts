import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

import { SCALAR_BUNDLE } from "@/config/scalar-bundle"

function installedApiReferenceVersion(): string {
	const require = createRequire(__filename)
	const entry = require.resolve("@scalar/nestjs-api-reference")
	let dir = dirname(entry)

	for (let depth = 0; depth < 5; depth += 1) {
		const candidate = join(dir, "package.json")
		if (existsSync(candidate)) {
			const pkg = JSON.parse(readFileSync(candidate, "utf8")) as {
				name?: string
				devDependencies?: Record<string, string>
			}
			if (pkg.name === "@scalar/nestjs-api-reference") {
				const version = pkg.devDependencies?.["@scalar/api-reference"]
				if (!version) {
					throw new Error(
						"Installed @scalar/nestjs-api-reference is missing devDependencies['@scalar/api-reference']"
					)
				}
				return version
			}
		}
		dir = dirname(dir)
	}

	throw new Error("Could not find the installed @scalar/nestjs-api-reference package.json")
}

describe("SCALAR_BUNDLE", () => {
	it("matches the @scalar/api-reference version the integration was built against", () => {
		expect(SCALAR_BUNDLE.version).toBe(installedApiReferenceVersion())
	})

	it("pins the URL to that version's standalone browser file", () => {
		expect(SCALAR_BUNDLE.url).toContain(`@${SCALAR_BUNDLE.version}/dist/browser/standalone.js`)
		expect(SCALAR_BUNDLE.url).toBe(
			`https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_BUNDLE.version}/dist/browser/standalone.js`
		)
	})

	it("carries a well-formed sha384 integrity value", () => {
		expect(SCALAR_BUNDLE.integrity).toMatch(/^sha384-[A-Za-z0-9+/]{64}$/)
	})

	const verifyLiveBundle = process.env.VERIFY_SCALAR_SRI === "1" ? it : it.skip

	verifyLiveBundle(
		"matches the sha384 of the live file",
		async () => {
			const response = await fetch(SCALAR_BUNDLE.url)
			expect(response.ok).toBe(true)
			const digest = createHash("sha384")
				.update(Buffer.from(await response.arrayBuffer()))
				.digest("base64")
			expect(`sha384-${digest}`).toBe(SCALAR_BUNDLE.integrity)
		},
		30_000
	)
})
