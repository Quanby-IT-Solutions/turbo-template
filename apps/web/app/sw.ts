/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Service worker source (Serwist / Turbopack).
 *
 * Caching safety model:
 * - API, auth, and any cross-origin request bypass the worker entirely
 *   (`bypassesServiceWorker`). The browser handles them natively, so a failed
 *   re-fetch inside the worker cannot mark the app offline or pause mutations.
 * - `/api` and `/api/...`   => NetworkOnly backstop, only if a request still
 *                              reaches Serwist. Never cache dynamic/auth
 *                              responses. Lookalike paths such as `/apiary`
 *                              are not included.
 * - Token-bearing URLs      => NetworkOnly. Single-use credentials must not be
 * written to any cache.
 * - RSC page data           => production only. NetworkFirst
 * (`pages-rsc-prefetch`, then `pages-rsc`), ahead of defaultCache. An error
 * flight is not written. A successful flight keeps those cache names and the
 * same expiration. Development follows serwist's NetworkOnly catch-all.
 * - Authenticated routes    => excluded from the offline fallback, so the app
 * never fakes a signed-in page.
 * - Static assets           => defaultCache (CacheFirst / StaleWhileRevalidate).
 * - Navigations (documents) => NetworkFirst behaviour via `fallbacks` to `/~offline`.
 */

import { defaultCache } from "@serwist/turbopack/worker"
import {
	ExpirationPlugin,
	NetworkFirst,
	NetworkOnly,
	Serwist,
	type PrecacheEntry,
	type RuntimeCaching,
	type SerwistGlobalConfig,
} from "serwist"

import {
	isRscPrefetchRequest,
	isRscRequest,
	RSC_EXPIRATION,
	RSC_RUNTIME_CACHE,
	rscCacheWillUpdate,
} from "@/features/pwa/lib/rsc-cache"
import {
	bypassesServiceWorker,
	carriesToken,
	isApiPath,
	mayServeOfflineFallback,
} from "@/features/pwa/lib/sw-exclusions"

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined
	}
}

declare const self: ServiceWorkerGlobalScope

/**
 * Same-origin RSC flights, ahead of `defaultCache`.
 *
 * Serwist's `defaultCache` is a NetworkOnly catch-all unless this is a
 * production build. These two routes mirror that production list (prefetch,
 * then page) and must not start caching flights in development. `NODE_ENV`
 * is the same build marker `defaultCache` reads. The worker bundle replaces
 * it, and `env.ts` is the Next app's validated env — importing it here would
 * pull that module into the worker.
 */
const rscPageDataRoutes: RuntimeCaching[] =
	// eslint-disable-next-line no-restricted-properties
	process.env.NODE_ENV === "production"
		? [
				// Same match, cache names, and expiration as the production RSC
				// routes. `cacheWillUpdate` reads a clone and drops an error
				// flight. Serwist returns the network response before that
				// write is scheduled.
				{
					matcher: isRscPrefetchRequest,
					handler: new NetworkFirst({
						cacheName: RSC_RUNTIME_CACHE.prefetch,
						plugins: [
							{ cacheWillUpdate: rscCacheWillUpdate },
							new ExpirationPlugin({ ...RSC_EXPIRATION }),
						],
					}),
				},
				{
					matcher: isRscRequest,
					handler: new NetworkFirst({
						cacheName: RSC_RUNTIME_CACHE.page,
						plugins: [
							{ cacheWillUpdate: rscCacheWillUpdate },
							new ExpirationPlugin({ ...RSC_EXPIRATION }),
						],
					}),
				},
			]
		: []

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	// The new worker does NOT take over mid-session.
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
		// Backstop only. The fetch listener below normally stops these requests
		// before Serwist sees them, for both same-origin `/api` (Nginx) and
		// cross-origin dev (`:3000/api`), without reading env at SW build time.
		// If one still reaches Serwist, NetworkOnly keeps the response out of
		// every cache. Matched only for `/api` and `/api/...`.
		{
			matcher: ({ url }) => isApiPath(url),
			handler: new NetworkOnly(),
		},
		// Reset and verification links travel as `?token=…` URLs.
		// Anything that caches them turns a single-use credential into a stored
		// one, readable from the Cache Storage viewer long after the flow ended.
		// Must precede defaultCache, which would otherwise handle the navigation.
		{
			matcher: ({ url }) => carriesToken(url),
			handler: new NetworkOnly(),
		},
		...rscPageDataRoutes,
		...defaultCache,
	],
	fallbacks: {
		entries: [
			{
				url: "/~offline",
				matcher({ request }) {
					if (request.destination !== "document") return false

					const url = new URL(request.url)

					// Never fake an authenticated page, and never
					// stand in for a token-bearing one.
					return mayServeOfflineFallback(url)
				},
			},
		],
	},
})

// The page asks the waiting worker to activate, once the user has
// agreed. This is the only path that skips waiting.
self.addEventListener("message", event => {
	if ((event.data as { type?: string } | undefined)?.type === "SKIP_WAITING") {
		void self.skipWaiting()
	}
})

// Registered before Serwist's fetch listener. `stopImmediatePropagation`
// without `respondWith` lets the browser perform the request itself, for every
// method. Serwist only routes GETs, but an API or cross-origin request must
// not be intercepted either way.
self.addEventListener("fetch", event => {
	const url = new URL(event.request.url)
	if (!bypassesServiceWorker(url, self.location.origin)) return
	event.stopImmediatePropagation()
})

serwist.addEventListeners()
