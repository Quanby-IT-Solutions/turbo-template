import { randomBytes } from "node:crypto"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { NextFunction, Request, RequestHandler, Response } from "express"
import helmet, { type HelmetOptions } from "helmet"

import { env } from "@/config/env.config"
import { SCALAR_BUNDLE } from "@/config/scalar-bundle"

/**
 * Browser-level defences for API responses.
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
 * Sending it before TLS terminates would pin clients to HTTPS on a
 * deployment that cannot serve it, and `max-age` cannot be taken back quickly.
 * Turn it on once TLS termination is live in the target environment.
 *
 * ## Docs page
 *
 * `/api/<version>/docs` is the one HTML response this API serves. The API
 * policy denies scripts and styles, so the reference UI never mounts under it.
 * When docs are enabled, `createDocsSecurityHeadersMiddleware` applies
 * `buildDocsHelmetOptions` to `GET /api/<version>/docs` (and the trailing-slash
 * form) and `buildHelmetOptions` to everything else, including `spec.json`.
 * The docs policy keeps the other helmet headers and changes only the CSP.
 *
 * The script source is the exact pinned bundle URL. `connect-src 'self'` covers
 * the spec fetch and same-origin try-it calls (`withDefaultFonts` and telemetry
 * are off, and there is no proxy URL).
 */
type ResponseWithLocals = ServerResponse & { locals?: { cspNonce?: unknown } }

const DOCS_PAGE_PATH = /^\/api\/[^/]+\/docs$/

/**
 * Headers other than CSP. Shared so the docs page keeps the same helmet
 * behaviour as every other response.
 *
 * Returned as `HelmetOptions` from a direct literal. Spreading a helper's
 * inferred type trips helmet's either/or header keys (`hsts` vs
 * `strictTransportSecurity`), so callers override CSP on a copy instead.
 */
function sharedHelmetOptions(): HelmetOptions {
	return {
		// Legacy header, still honoured by older browsers that ignore
		// frame-ancestors. Belt and braces on the clickjacking path.
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

/**
 * API policy. JSON responses deny every fetch and frame.
 * The disabled-docs path registers `helmet(buildHelmetOptions())` directly.
 */
export function buildHelmetOptions(): HelmetOptions {
	return {
		...sharedHelmetOptions(),
		contentSecurityPolicy: {
			useDefaults: false,
			directives: {
				"default-src": ["'none'"],
				"frame-ancestors": ["'none'"],
				"base-uri": ["'none'"],
				"form-action": ["'none'"],
			},
		},
	}
}

function pathnameOf(value: string): string {
	const withoutQuery = value.split("?")[0] ?? ""
	if (withoutQuery.length > 1) {
		return withoutQuery.replace(/\/+$/, "")
	}
	return withoutQuery
}

function requestPathname(req: { path?: string; originalUrl?: string; url?: string }): string {
	// Root middleware sees the full path on `req.path`. A handler mounted under
	// `/api/<version>/docs` sees a stripped `req.path`, so fall back to the
	// original URL there.
	if (req.path?.startsWith("/api/")) {
		return pathnameOf(req.path)
	}
	return pathnameOf(req.originalUrl ?? req.url ?? "")
}

/** GET /api/<version>/docs, including a trailing slash or query string. */
export function isApiDocsPageRequest(req: {
	method?: string
	path?: string
	originalUrl?: string
	url?: string
}): boolean {
	if (req.method !== "GET") {
		return false
	}
	return DOCS_PAGE_PATH.test(requestPathname(req))
}

function requireNonce(res: ServerResponse): string {
	const nonce = (res as ResponseWithLocals).locals?.cspNonce
	if (typeof nonce !== "string" || nonce.length === 0) {
		throw new Error("Docs page nonce was not set")
	}
	return nonce
}

function quotedNonce(_req: IncomingMessage, res: ServerResponse): string {
	return `'nonce-${requireNonce(res)}'`
}

export function buildDocsHelmetOptions(): HelmetOptions {
	return {
		...sharedHelmetOptions(),
		contentSecurityPolicy: {
			useDefaults: false,
			directives: {
				"default-src": ["'none'"],
				"script-src": [quotedNonce, SCALAR_BUNDLE.url],
				// Scalar injects style elements and style attributes at runtime.
				// A nonce-only style-src blocked both (`style-src-elem` and
				// `style-src-attr` inline violations in the browser check), and
				// those elements cannot carry this response's nonce. 'unsafe-inline'
				// is docs-route only. A nonce is omitted here because a nonce
				// source makes browsers ignore 'unsafe-inline'.
				"style-src": ["'unsafe-inline'"],
				"connect-src": ["'self'"],
				"img-src": ["'self'", "data:"],
				"font-src": ["'self'", "data:"],
				"frame-ancestors": ["'none'"],
				"base-uri": ["'none'"],
				"form-action": ["'none'"],
			},
		},
	}
}

export function readCspNonce(res: { locals?: { cspNonce?: unknown } }): string | undefined {
	const nonce = res.locals?.cspNonce
	if (typeof nonce !== "string" || nonce.length === 0) {
		return undefined
	}
	return nonce
}

/**
 * Route-scoped headers used only when API docs are enabled.
 * Docs HTML gets the docs policy; every other request gets the API policy.
 */
export function createDocsSecurityHeadersMiddleware(): RequestHandler {
	const apiHeaders = helmet(buildHelmetOptions())
	const docsHeaders = helmet(buildDocsHelmetOptions())

	return (req: Request, res: Response, next: NextFunction) => {
		if (isApiDocsPageRequest(req)) {
			res.locals.cspNonce = randomBytes(16).toString("base64")
			docsHeaders(req, res, next)
			return
		}
		apiHeaders(req, res, next)
	}
}
