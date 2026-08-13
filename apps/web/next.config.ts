import "dotenv/config"

import type { NextConfig } from "next"
import { PHASE_PRODUCTION_BUILD } from "next/constants"
import path from "node:path"
import { withSentryConfig } from "@sentry/nextjs"
import { withSerwist } from "@serwist/turbopack"

import "./env"

/** @type {import("next").NextConfig} */
const config: NextConfig = {
	typedRoutes: true,
	output: "standalone",
	outputFileTracingRoot: path.resolve(import.meta.dirname, "../../"),

	/**
	 * Keep the Sentry SDK out of the bundled server graph.
	 *
	 * `@sentry/node` reaches for `node:inspector`, and bundling it makes
	 * Turbopack emit a chunk whose filename contains that literal colon. Windows
	 * cannot name a file that way, so `output: "standalone"` fails to copy it and
	 * the build dies on a developer machine while passing in CI. Loading the SDK
	 * from `node_modules` at runtime sidesteps the chunk entirely, and is what
	 * Sentry's auto-instrumentation of other server packages wants anyway.
	 */
	serverExternalPackages: ["@sentry/nextjs"],

	/** Enables hot reloading for local packages without a build step */
	transpilePackages: [
		"@repo/auth",
		"@repo/backend",
		"@repo/contracts",
		"@repo/db",
		"@t3-oss/env-core",
		"@t3-oss/env-nextjs",
	],

	// CI-4 / F-22: `typescript.ignoreBuildErrors` was true, so type errors in
	// permission logic shipped silently. Deleted deliberately — do not restore
	// it; fix the types instead.
	reactCompiler: true,

	devIndicators: {
		position: "bottom-right",
	},

	/**
	 * Give the browser bundle the same Sentry environment the server and edge
	 * runtimes resolve.
	 *
	 * Only `NEXT_PUBLIC_*` reads survive client bundling, so an operator who sets
	 * `SENTRY_ENVIRONMENT=staging` alone would otherwise get server events tagged
	 * `staging` and browser events tagged `production`. Projecting the value here
	 * inlines it at build time under the public name `env.ts` reads. An explicit
	 * `NEXT_PUBLIC_SENTRY_ENVIRONMENT` always wins, and when neither is set
	 * nothing is added — the client falls back to NODE_ENV.
	 */
	env:
		process.env.SENTRY_ENVIRONMENT && !process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT
			? { NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT }
			: {},

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

/**
 * Next passes the phase on every config load, which is the only way to tell a
 * `next build` apart from a `next dev` at this point — the upload notice below
 * has to stay out of the dev server's output.
 */
export default (phase: string) => {
	/**
	 * Say out loud that source maps are not being uploaded.
	 *
	 * The plugin runs in `silent` mode below and skips upload without a word when
	 * there is no auth token, so a production build would otherwise ship minified
	 * stack traces while looking exactly like a build that had uploaded them. The
	 * build stays green either way — a missing observability credential is not a
	 * reason to fail a contributor's build — but the operator gets one line saying
	 * what was skipped.
	 *
	 * Only during `next build`: upload is a build-time step, and a developer
	 * running `next dev` with monitoring off should get no console noise at all.
	 */
	if (
		phase === PHASE_PRODUCTION_BUILD &&
		!process.env.SENTRY_AUTH_TOKEN &&
		!process.env.SENTRY_UPLOAD_NOTICE_PRINTED
	) {
		// Next loads this config once per build worker, so the notice would otherwise
		// repeat four or five times. The marker is set on the environment rather than
		// in module scope because the workers are separate processes that inherit it.
		process.env.SENTRY_UPLOAD_NOTICE_PRINTED = "1"
		console.info(
			"[sentry] SENTRY_AUTH_TOKEN is not set — skipping source-map upload; stack traces will stay minified."
		)
	}

	/**
	 * Sentry wraps the Serwist-wrapped config, not the reverse: Serwist owns the
	 * service worker entry and Sentry only decorates the result, so composing the
	 * other way round would hand Sentry a config Serwist has not finished building.
	 */
	return withSentryConfig(withSerwist(config), {
		/**
		 * Client events are POSTed to a same-origin route instead of Sentry's ingest
		 * host. That keeps `connect-src 'self'` above sufficient — no Sentry origin
		 * is added to the CSP, and the policy in `headers()` stays untouched — and
		 * it stops ad blockers eating the reports on the way out.
		 *
		 * Implemented as a rewrite to Sentry's ingest endpoint, so nothing needs
		 * adding to `app/sw.ts`: the runtime caches there only route GET, and
		 * `/monitoring` is POST and outside `/api` either way.
		 */
		tunnelRoute: "/monitoring",

		/**
		 * Source-map upload credentials.
		 *
		 * All three are `undefined` for contributor and CI builds without Sentry
		 * configured, and that alone is what keeps upload inert — the plugin skips
		 * release creation entirely when there is no auth token, so no extra
		 * "disabled" switch is needed.
		 */
		org: process.env.SENTRY_ORG,
		project: process.env.SENTRY_PROJECT,
		authToken: process.env.SENTRY_AUTH_TOKEN,

		/**
		 * Delete the `.map` files once Sentry has them.
		 *
		 * They are emitted next to the client bundle, so `output: "standalone"`
		 * copies them into the image and Next serves them from `/_next/static/` —
		 * anyone could fetch the unminified source of the whole app. Sentry only
		 * needs the maps at upload time; after that keeping them on disk buys
		 * nothing and publishes the source. With no auth token nothing is uploaded
		 * and nothing is generated to delete, so this is inert for builds without
		 * Sentry configured.
		 */
		sourcemaps: {
			deleteSourcemapsAfterUpload: true,
		},

		/**
		 * Without this the plugin narrates every build, including the disabled ones
		 * it has nothing to say about.
		 */
		silent: true,
	})
}
