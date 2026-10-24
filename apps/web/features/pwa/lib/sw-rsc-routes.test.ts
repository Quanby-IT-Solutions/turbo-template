// @vitest-environment node
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import * as esbuild from "esbuild"
import { describe, expect, it } from "vitest"

/**
 * The worker bundle folds `process.env.NODE_ENV` the same way Serwist builds
 * `defaultCache`: minify off in development, minify on in production. Vitest
 * has no service worker, so this bundles `app/sw.ts` with those two settings.
 */

const appRoot = fileURLToPath(new URL("../../../", import.meta.url))

async function bundleWorker(minify: boolean): Promise<string> {
	const result = await esbuild.build({
		absWorkingDir: appRoot,
		entryPoints: ["app/sw.ts"],
		bundle: true,
		write: false,
		format: "esm",
		platform: "browser",
		treeShaking: true,
		minify,
		alias: { "@": appRoot },
		logLevel: "silent",
	})
	const output = result.outputFiles?.[0]?.text
	if (!output) throw new Error("service worker bundle was empty")
	return output
}

describe("RSC page-data route registration", () => {
	const sw = readFileSync(new URL("../../../app/sw.ts", import.meta.url), "utf8")

	it("spreads the RSC routes after the network-only routes and before defaultCache", () => {
		const runtime = sw.slice(sw.indexOf("runtimeCaching:"))
		const api = runtime.indexOf("isApiPath")
		const token = runtime.indexOf("carriesToken")
		const rsc = runtime.indexOf("...rscPageDataRoutes")
		const fallback = runtime.indexOf("...defaultCache")

		expect(api).toBeGreaterThan(-1)
		expect(token).toBeGreaterThan(api)
		expect(rsc).toBeGreaterThan(token)
		expect(fallback).toBeGreaterThan(rsc)
		expect(sw).toContain('process.env.NODE_ENV === "production"')
		expect(sw).toContain("skipWaiting: false")
		expect(sw).toContain("clientsClaim: true")
		expect(sw).toContain("navigationPreload: true")
	})

	it("leaves the RSC caches out of a development worker", async () => {
		const source = await bundleWorker(false)

		expect(source).not.toContain("pages-rsc")
		expect(source).not.toContain("E\\{")
		expect(source).toContain("matcher: /.*/i")
		expect(source).toContain("/~offline")
		expect(source).toContain("SKIP_WAITING")
		expect(source).toContain("stopImmediatePropagation")
		expect(source).toContain('"token"')
	})

	it("keeps the RSC caches and the error-flight guard in a production worker", async () => {
		const source = await bundleWorker(true)

		expect(source).toContain("pages-rsc-prefetch")
		expect(source).toContain("pages-rsc")
		expect(source).toContain("E\\{")
		expect(source).toContain("/~offline")
		expect(source).toContain("SKIP_WAITING")
		expect(source).toContain("stopImmediatePropagation")
		expect(source).toContain('"token"')
	})
})
