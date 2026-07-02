/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Service worker source (Serwist / Turbopack).
 *
 * Caching safety model:
 * - API + auth (`/api/*`)   => NetworkOnly. Never cache dynamic/auth responses.
 * - Static assets           => defaultCache (CacheFirst / StaleWhileRevalidate).
 * - Navigations (documents) => NetworkFirst behaviour via `fallbacks` to `/~offline`.
 */

import { defaultCache } from "@serwist/turbopack/worker"
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist"

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined
	}
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	skipWaiting: true,
	clientsClaim: true,
	navigationPreload: true,
	runtimeCaching: [
		// Order matters: this MUST come before defaultCache.
		// Covers same-origin prod (Nginx `/api`) and cross-origin dev (`:3000/api`)
		// without reading env at SW build time. Auth/dynamic responses must never
		// be cached, so force NetworkOnly for anything under `/api`.
		{
			matcher: ({ url }) => url.pathname.startsWith("/api"),
			handler: new NetworkOnly(),
		},
		...defaultCache,
	],
	fallbacks: {
		entries: [
			{
				url: "/~offline",
				matcher({ request }) {
					return request.destination === "document"
				},
			},
		],
	},
})

serwist.addEventListeners()
