/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Service worker source (Serwist / Turbopack).
 *
 * Caching safety model:
 * - API + auth (`/api/*`)   => NetworkOnly. Never cache dynamic/auth responses.
 * - Token-bearing URLs      => NetworkOnly. Single-use credentials must not be
 *                              written to any cache (WC-2 / F-20).
 * - Authenticated routes    => excluded from the offline fallback, so the app
 *                              never fakes a signed-in page (WC-2 / F-48).
 * - Static assets           => defaultCache (CacheFirst / StaleWhileRevalidate).
 * - Navigations (documents) => NetworkFirst behaviour via `fallbacks` to `/~offline`.
 */

import { defaultCache } from "@serwist/turbopack/worker"
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist"

import { carriesToken, mayServeOfflineFallback } from "@/features/pwa/lib/sw-exclusions"

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined
	}
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	// WC-4 / F-49: the new worker does NOT take over mid-session.
	//
	// `skipWaiting: true` activated a freshly-installed worker immediately,
	// swapping the code serving an open tab underneath the user — a half-loaded
	// page can end up mixing old and new chunks, and there was no production
	// path to recover from a bad worker.
	//
	// It now waits. `SerwistRegistrationProvider` detects the waiting worker and
	// prompts; the user chooses when to reload. `clientsClaim` stays true so
	// that once a worker DOES activate it controls existing tabs rather than
	// leaving them uncontrolled until the next navigation.
	skipWaiting: false,
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
		// WC-2 / F-20: reset and verification links travel as `?token=…` URLs.
		// Anything that caches them turns a single-use credential into a stored
		// one, readable from the Cache Storage viewer long after the flow ended.
		// Must precede defaultCache, which would otherwise handle the navigation.
		{
			matcher: ({ url }) => carriesToken(url),
			handler: new NetworkOnly(),
		},
		...defaultCache,
	],
	fallbacks: {
		entries: [
			{
				url: "/~offline",
				matcher({ request }) {
					if (request.destination !== "document") return false

					const url = new URL(request.url)

					// WC-2 / F-48: never fake an authenticated page, and never
					// stand in for a token-bearing one.
					return mayServeOfflineFallback(url)
				},
			},
		],
	},
})

// WC-4 / F-49: the page asks the waiting worker to activate, once the user has
// agreed. This is the only path that skips waiting.
self.addEventListener("message", event => {
	if ((event.data as { type?: string } | undefined)?.type === "SKIP_WAITING") {
		void self.skipWaiting()
	}
})

serwist.addEventListeners()
