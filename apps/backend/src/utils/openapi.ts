import { Logger } from "@nestjs/common"

import { getAuth } from "@repo/auth"

const logger = new Logger("OpenApi")

/** One warning per process when the plugin is missing, not one per API version. */
let missingPluginWarned = false

/** OpenAPI document shape (compatible with both oRPC and NestJS swagger output) */
interface OpenAPIDocument {
	openapi?: string
	info?: Record<string, unknown>
	servers?: Array<Record<string, unknown>>
	paths?: Record<string, Record<string, unknown> | undefined>
	tags?: Array<{ name: string; description?: string }>
	components?: {
		schemas?: Record<string, unknown>
		securitySchemes?: Record<string, unknown>
		[key: string]: unknown
	}
	[key: string]: unknown
}

/** Human-friendly operation summaries for Better Auth endpoints */
const AUTH_OPERATION_SUMMARIES: Record<string, string> = {
	"/sign-in/email": "Sign In (Email)",
	"/sign-in/social": "Sign In (Social)",
	"/sign-up/email": "Sign Up (Email)",
	"/sign-out": "Sign Out",
	"/get-session": "Get Session",
	"/list-sessions": "List Sessions",
	"/revoke-session": "Revoke Session",
	"/revoke-sessions": "Revoke All Sessions",
	"/revoke-other-sessions": "Revoke Other Sessions",
	"/update-user": "Update User",
	"/delete-user": "Delete User",
	"/delete-user/callback": "Delete User Callback",
	"/change-password": "Change Password",
	"/change-email": "Change Email",
	"/verify-email": "Verify Email",
	"/send-verification-email": "Send Verification Email",
	"/request-password-reset": "Request Password Reset",
	"/reset-password": "Reset Password",
	"/reset-password/{token}": "Reset Password (Token)",
	"/verify-password": "Verify Password",
	"/link-social": "Link Social Account",
	"/unlink-account": "Unlink Account",
	"/list-accounts": "List Accounts",
	"/account-info": "Account Info",
	"/refresh-token": "Refresh Token",
	"/get-access-token": "Get Access Token",
	"/ok": "Health Check",
	"/error": "Error",
}

/**
 * Maps tags from old tag name to new tag name
 */
function mapTags<T extends { name: string }>(tags: T[], oldTag: string, newTag: string): T[] {
	return tags.map(tag => (tag.name === oldTag ? { ...tag, name: newTag } : tag))
}

/**
 * Merges two component objects of the same type
 */
function mergeComponents<T extends Record<string, unknown>>(
	base?: T,
	additional?: T
): T | undefined {
	if (!base && !additional) return undefined
	if (!base) return additional
	if (!additional) return base
	return { ...base, ...additional } as T
}

/**
 * Transforms path operations by adding prefix, summaries, and mapping tags
 */
function transformPathOperations(
	paths: OpenAPIDocument["paths"],
	prefix: string,
	summaries: Record<string, string>,
	oldTag: string,
	newTag: string
): OpenAPIDocument["paths"] {
	const transformed: OpenAPIDocument["paths"] = {}

	for (const [path, methods] of Object.entries(paths ?? {})) {
		const prefixedPath = `${prefix}${path}`
		const summary = summaries[path]

		const transformedMethods: Record<string, object> = {}
		for (const [method, op] of Object.entries(methods ?? {})) {
			if (!op || typeof op !== "object") continue

			const operation = op as Record<string, unknown>
			const tags = (operation.tags as string[] | undefined) ?? []

			transformedMethods[method] = {
				...operation,
				summary: summary ?? path.replace(/^\//, "").replace(/-/g, " "),
				tags: mapTags(
					tags.map(t => ({ name: t })),
					oldTag,
					newTag
				).map(t => t.name),
			}
		}
		transformed[prefixedPath] = transformedMethods
	}

	return transformed
}

interface OpenApiCapableApi {
	generateOpenAPISchema?: () => Promise<OpenAPIDocument>
}

/**
 * Generate Better Auth OpenAPI schema.
 *
 * Returns null when the openAPI plugin is not registered. Callers must not
 * assume `generateOpenAPISchema` exists.
 */
export async function generateBetterAuthSchema(): Promise<OpenAPIDocument | null> {
	const api = getAuth().api as unknown as OpenApiCapableApi
	if (typeof api.generateOpenAPISchema !== "function") {
		return null
	}

	return api.generateOpenAPISchema()
}

/**
 * Merge Better Auth schema into main OpenAPI document with prefixed paths and friendly names
 */
export async function mergeBetterAuthSchema(
	baseDoc: OpenAPIDocument,
	version: string
): Promise<OpenAPIDocument> {
	try {
		const betterAuthSchema = await generateBetterAuthSchema()
		if (!betterAuthSchema) {
			if (!missingPluginWarned) {
				missingPluginWarned = true
				logger.warn(
					"Better Auth openAPI plugin is not registered; serving the API spec without auth paths"
				)
			}
			return baseDoc
		}

		const authPrefix = `/${version}/auth`
		const oldTag = "Default"
		const newTag = "Auth"

		const updatedTags = betterAuthSchema.tags
			? mapTags(betterAuthSchema.tags, oldTag, newTag)
			: [{ name: newTag, description: "Authentication endpoints" }]

		const prefixedPaths = transformPathOperations(
			betterAuthSchema.paths,
			authPrefix,
			AUTH_OPERATION_SUMMARIES,
			oldTag,
			newTag
		)

		return {
			...baseDoc,
			paths: {
				...(baseDoc.paths ?? {}),
				...prefixedPaths,
			},
			tags: [...(baseDoc.tags ?? []), ...updatedTags],
			components: {
				...(baseDoc.components ?? {}),
				...(betterAuthSchema.components ?? {}),
				schemas: mergeComponents(baseDoc.components?.schemas, betterAuthSchema.components?.schemas),
				securitySchemes: mergeComponents(
					baseDoc.components?.securitySchemes,
					betterAuthSchema.components?.securitySchemes
				),
			},
		}
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error)
		logger.error(`Failed to merge Better Auth OpenAPI schema: ${detail}`)
		return baseDoc
	}
}
