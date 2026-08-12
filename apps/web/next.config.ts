import "dotenv/config"

import type { NextConfig } from "next"
import path from "node:path"
import { withSerwist } from "@serwist/turbopack"

import "./env"

/** @type {import("next").NextConfig} */
const config: NextConfig = {
	typedRoutes: true,
	output: "standalone",
	outputFileTracingRoot: path.resolve(import.meta.dirname, "../../"),

	/** Enables hot reloading for local packages without a build step */
	transpilePackages: [
		"@repo/auth",
		"@repo/backend",
		"@repo/contracts",
		"@repo/db",
		"@t3-oss/env-core",
		"@t3-oss/env-nextjs",
	],

	typescript: { ignoreBuildErrors: true },
	reactCompiler: true,

	devIndicators: {
		position: "bottom-right",
	},

	/**
	 * Browser-level defences for every HTML response (ED-1 / F-12, F-21).
	 *
	 * Next.js owns the page CSP because it is the only layer that knows what
	 * the app actually loads. The backend sets its own, much tighter policy for
	 * JSON (see `security-headers.config.ts`), and Nginx deliberately adds
	 * nothing either already sets — a duplicated CSP is intersected by the
	 * browser, so two reasonable policies can combine into one that breaks the
	 * app.
	 */
	async headers() {
		const isDev = process.env.NODE_ENV === "development"

		// Reduce the API base URL to its origin; see connect-src below.
		const apiOrigin = (() => {
			const raw = process.env.NEXT_PUBLIC_API_BASE_URL
			if (!raw) return ""
			try {
				return new URL(raw).origin
			} catch {
				// Relative base URL (same-origin proxy topology) — 'self' covers it.
				return ""
			}
		})()

		const csp = [
			"default-src 'self'",
			// `unsafe-inline` is required: Next.js inlines its hydration and
			// bootstrap scripts. `unsafe-eval` is dev-only — React Refresh needs
			// it, production does not.
			`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
			// Tailwind and next-themes both set inline styles at runtime.
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: blob:",
			"font-src 'self' data:",
			// The API ORIGIN, not the base URL. A CSP source with a path is
			// matched as a path prefix, so `http://host:3000/api` permits only
			// that exact path and blocks `/api/v1/...` — which is every request
			// the app actually makes.
			`connect-src 'self' ${apiOrigin}${isDev ? " ws: wss:" : ""}`.trim(),
			"worker-src 'self' blob:",
			"manifest-src 'self'",
			// Retires the F-21 clickjacking path: /user-management cannot be
			// framed, so framed clicks can never reach role assignment.
			"frame-ancestors 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			"object-src 'none'",
		].join("; ")

		const headers = [
			{ key: "Content-Security-Policy", value: csp },
			// Legacy equivalent of frame-ancestors, for browsers that ignore CSP.
			{ key: "X-Frame-Options", value: "DENY" },
			{ key: "X-Content-Type-Options", value: "nosniff" },
			{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
			{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
		]

		// HSTS is a promise the browser remembers and max-age cannot be
		// withdrawn quickly, so it waits for TLS to actually terminate (ED-2).
		if (process.env.ENABLE_HSTS === "true") {
			headers.push({
				key: "Strict-Transport-Security",
				value: "max-age=31536000; includeSubDomains",
			})
		}

		return [{ source: "/:path*", headers }]
	},
}

export default withSerwist(config)
