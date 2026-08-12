import type { HelmetOptions } from "helmet"

import { env } from "@/config/env.config"

/**
 * Browser-level defences for API responses (ED-1 / F-12, F-21).
 *
 * ## Ownership between layers
 *
 * Three layers can set headers and duplicates are worse than absence — a
 * doubled CSP is intersected by the browser, so two "reasonable" policies can
 * combine into one that blocks the app. The split is:
 *
 *   - **Next.js** owns the headers on HTML it serves (see `next.config.ts`),
 *     including the page CSP. It is the only layer that knows what the app
 *     actually loads.
 *   - **NestJS (here)** owns the headers on API responses. JSON needs a much
 *     tighter policy than a page: it should never frame, never execute, and
 *     never be sniffed into something executable.
 *   - **Nginx** adds nothing either already sets. It only fills in for
 *     responses it generates itself, such as its own 413 or 502 pages, which
 *     never reach an application at all.
 *
 * ## HSTS
 *
 * Gated behind `ENABLE_HSTS` because it is a promise the browser remembers.
 * Sending it before TLS terminates (ED-2) would pin clients to HTTPS on a
 * deployment that cannot serve it, and `max-age` cannot be taken back quickly.
 * Turn it on once ED-2 is live in the target environment.
 */
export function buildHelmetOptions(): HelmetOptions {
	return {
		// An API serves JSON. Nothing here should ever load a script, a style,
		// or a frame, so the policy denies everything and allows nothing back.
		contentSecurityPolicy: {
			useDefaults: false,
			directives: {
				"default-src": ["'none'"],
				"frame-ancestors": ["'none'"],
				"base-uri": ["'none'"],
				"form-action": ["'none'"],
			},
		},
		// Legacy header, still honoured by older browsers that ignore
		// frame-ancestors. Belt and braces on the clickjacking path (F-21).
		frameguard: { action: "deny" },
		// Stops a JSON response being re-interpreted as HTML or a script.
		noSniff: true,
		referrerPolicy: { policy: "strict-origin-when-cross-origin" },
		// Off: it is a fingerprinting surface and Chrome ignores it. The real
		// control is the CSP above.
		xssFilter: false,
		hidePoweredBy: true,
		hsts: env.ENABLE_HSTS ? { maxAge: 31_536_000, includeSubDomains: true, preload: false } : false,
		// Not applicable to a JSON API, and each one is a header on every
		// response.
		crossOriginEmbedderPolicy: false,
		crossOriginOpenerPolicy: false,
		// `same-site` would break the web app reading the API cross-origin in
		// the split-port topology; CORS already governs who may read responses.
		crossOriginResourcePolicy: false,
		originAgentCluster: false,
		dnsPrefetchControl: false,
		ieNoOpen: false,
		permittedCrossDomainPolicies: false,
	}
}
