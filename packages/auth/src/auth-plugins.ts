import { openAPI } from "better-auth/plugins"

/**
 * Plugins for the shared Better Auth instance.
 *
 * The openAPI reference is a debug surface. It is registered only when docs
 * are enabled, and `createAuth` passes `isApiDocsEnabled(...)` so the plugin
 * follows the same rule as the backend.
 *
 * Kept out of `config.ts` so the list can be asserted without a database
 * connection or `createEnv()`.
 */
export function buildAuthPlugins(docsEnabled: boolean) {
	return [...(docsEnabled ? [openAPI({ path: "/reference" })] : [])]
}
