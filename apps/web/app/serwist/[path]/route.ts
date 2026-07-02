import { execSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { createSerwistRoute } from "@serwist/turbopack"

import { env } from "@/env"

const isProd = env.NODE_ENV === "production"

/**
 * Build-specific precache revision for `/~offline`.
 *
 * Serwist/Workbox only refreshes a precached HTML entry when its `revision`
 * changes, so the value MUST change whenever a new build ships or the offline
 * route output changes. The package version (`npm_package_version`) rarely
 * moves across deployments, which strands installed clients on a stale
 * fallback page — so we derive the revision from the git commit instead, and
 * fall back to hashing the offline route sources when git is unavailable.
 */
function resolveOfflineRevision(): string {
	// CI providers expose the deployed commit directly.
	const commitFromEnv = env.VERCEL_GIT_COMMIT_SHA ?? env.GITHUB_SHA ?? env.GIT_COMMIT_SHA

	if (commitFromEnv) {
		return commitFromEnv
	}

	// Local/standalone builds: read the current commit from git.
	try {
		const sha = execSync("git rev-parse HEAD", {
			cwd: process.cwd(),
			stdio: ["ignore", "pipe", "ignore"],
		})
			.toString()
			.trim()

		if (sha) {
			return sha
		}
	} catch {
		// git not available — fall through to content hashing.
	}

	// No git: hash the offline route sources so edits still bust the cache.
	try {
		const cwd = process.cwd()
		const sources = ["app/~offline/page.tsx", "features/pwa/components/offline-view.tsx"]
		const hash = createHash("sha256")

		for (const relative of sources) {
			hash.update(readFileSync(path.join(cwd, relative)))
		}

		return hash.digest("hex")
	} catch {
		// Deterministic last resort so the build never fails.
		return "1"
	}
}

// Dev guard: never serve a working SW outside production. In dev the route
// returns 404 so no service worker is ever registered from this endpoint.
const offlineRevision = resolveOfflineRevision()

const route = isProd
	? createSerwistRoute({
			swSrc: "app/sw.ts",
			useNativeEsbuild: true,
			additionalPrecacheEntries: [{ url: "/~offline", revision: offlineRevision }],
		})
	: null

// Next.js 16 (Turbopack) statically parses these route-segment config exports,
// so they MUST be literals — not `route?.x`. The values match what
// `createSerwistRoute` returns; in dev (`route` null) they stay inert since GET
// short-circuits to 404 and no static params are generated.
export const dynamic = "force-static"
export const dynamicParams = false
export const revalidate = false
export const generateStaticParams = route?.generateStaticParams ?? (() => Promise.resolve([]))
export const GET = route ? route.GET : () => new Response(null, { status: 404 })
