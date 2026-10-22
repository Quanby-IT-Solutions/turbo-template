import { Logger, type INestApplication } from "@nestjs/common"
import type { IncomingMessage, ServerResponse } from "http"
import { toNodeHandler } from "better-auth/node"

import { AUTH_BASE_PATH, AUTH_CLIENT_ADDRESS_HEADER, getAuth } from "@repo/auth"

import { enforceAuthBodyLimit } from "@/common/auth-body-limit"
import { getVersionKeys } from "@/config/api-versions.config"
import { MAX_REQUEST_BODY_SIZE } from "@/config/app.config"
import { generateBetterAuthSchema } from "@/utils/openapi"

const logger = new Logger("BetterAuthConfig")

interface AuthIncomingMessage extends IncomingMessage {
	/** Address Express resolved from `trust proxy`. Absent when unset. */
	ip?: string
}

/**
 * Write the client address Better Auth's limiter keys on.
 *
 * Express resolves `req.ip` from the trust chain in DOMAIN-MODEL.md
 * (`trust proxy` = TRUST_PROXY): one trusted hop, so the rightmost entry is
 * the address that hop saw. Better Auth reads only
 * `AUTH_CLIENT_ADDRESS_HEADER` and only when it is a single address, so
 * every own header of that name, in any letter case, is removed first. A
 * request with no `req.ip` gets no header and keeps the library's own
 * fallback.
 */
function applyResolvedClientAddress(req: AuthIncomingMessage): void {
	for (const name of Object.keys(req.headers)) {
		if (name.toLowerCase() === AUTH_CLIENT_ADDRESS_HEADER) {
			delete req.headers[name]
		}
	}
	const address = req.ip
	if (!address) {
		return
	}
	req.headers[AUTH_CLIENT_ADDRESS_HEADER] = address
}

// No context name: the warn line is only requestId, status and type, the same
// shape the JSON parser's 413 uses.
const bodyLimitLogger = new Logger()

interface JsonResponse {
	status: (code: number) => JsonResponse
	json: (body: Record<string, unknown>) => void
}

/**
 * Creates middleware that routes versioned auth paths to Better Auth
 *
 * Rewrites URLs like /api/v1/auth/ok -> /auth/ok before passing to Better Auth handler.
 * This allows the same Better Auth instance to handle all API versions.
 */
function createAuthMiddleware(versionedAuthPaths: string[]) {
	const handler = toNodeHandler(getAuth())

	return (req: AuthIncomingMessage, res: ServerResponse, next: () => void) => {
		const url = req.url ?? ""

		// Paths match on a PREFIX BOUNDARY, not a bare `startsWith`.
		//
		// `startsWith("/api/v1/auth")` also matched `/api/v1/authx/...` and
		// `/api/v1/authorize`, so any current or future route whose name merely
		// begins with "auth" was swallowed by the Better Auth handler and never
		// reached Nest — silently, and with Better Auth deciding the response.
		//
		// A path matches only when it IS the base path, or continues with `/`
		// or `?`.
		const matchedPath = versionedAuthPaths.find(path => {
			if (!url.startsWith(path)) return false
			const next = url.charAt(path.length)
			return next === "" || next === "/" || next === "?"
		})

		if (matchedPath) {
			req.url = url.replace(matchedPath, AUTH_BASE_PATH)
			applyResolvedClientAddress(req)
			// Better Auth reads the raw stream and the pinned handler accepts
			// no body limit. Cap the body here, before that handler runs.
			// GET, HEAD, OPTIONS and requests with no body are forwarded as they
			// arrived. A body within the limit is placed on `req.body` as text
			// so the handler forwards those bytes unchanged.
			return enforceAuthBodyLimit(req, res, {
				limit: MAX_REQUEST_BODY_SIZE,
				log: entry => {
					bodyLimitLogger.warn(entry)
				},
				forward: () => handler(req, res),
			})
		}

		next()
	}
}

/**
 * Registers OpenAPI documentation endpoint for auth routes
 */
function registerAuthOpenApiEndpoint(httpServer: any, authPath: string): void {
	httpServer.get(`${authPath}/open-api`, async (_: unknown, res: JsonResponse) => {
		const schema = await generateBetterAuthSchema()
		if (!schema) {
			res.status(404).json({ statusCode: 404, message: "Not Found" })
			return
		}

		res.json(schema)
	})
}

/**
 * Set up Better Auth routes for all registered API versions
 *
 * Routes are registered at /api/v1/auth/*, /api/v2/auth/*, etc.
 * All versions share the same Better Auth instance with URL rewriting.
 */
export function setupBetterAuth(app: INestApplication, enableApiDocs: boolean): void {
	const httpServer = app.getHttpAdapter().getInstance()
	const versions = getVersionKeys()
	const authPaths = versions.map(version => `/api/${version}/auth`)

	// The open-api endpoint is documentation-only and gated by enableApiDocs.
	// It MUST be registered before the catch-all Better Auth middleware below:
	// createAuthMiddleware() matches any /api/v*/auth/* URL and returns the
	// Better Auth handler without calling next(), so registering it afterwards
	// would leave /api/v*/auth/open-api unreachable. Express dispatches routes
	// in registration order, so this specific GET wins over the later use().
	if (enableApiDocs) {
		for (const authPath of authPaths) {
			registerAuthOpenApiEndpoint(httpServer, authPath)
			logger.log(`Auth routes registered at ${authPath}/* (open-api endpoint enabled)`)
		}
	} else {
		for (const authPath of authPaths) {
			logger.log(`Auth routes registered at ${authPath}/* (open-api endpoint disabled)`)
		}
	}

	// Single middleware handles all remaining versioned auth routes (always registered)
	httpServer.use(createAuthMiddleware(authPaths))
}
