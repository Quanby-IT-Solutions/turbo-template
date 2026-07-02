"use client"

import React from "react"
import { SerwistProvider } from "@serwist/turbopack/react"

import { env } from "@/env"

/**
 * PWA service-worker registration boundary.
 *
 * - Production: registers the SW served at `/serwist/sw.js`.
 * - Development: renders children directly and self-heals by unregistering any
 *   SW + deleting PWA caches left over from a prior production build on the
 *   same origin (e.g. localhost).
 */
export function SerwistRegistrationProvider({ children }: { children: React.ReactNode }) {
	const isProd = env.NODE_ENV === "production"

	React.useEffect(() => {
		if (env.NODE_ENV === "production") {
			return
		}

		if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
			return
		}

		void navigator.serviceWorker.getRegistrations().then(registrations => {
			for (const registration of registrations) {
				void registration.unregister()
			}
		})

		// Dev-only: delete ALL caches for this origin. Serwist's Next.js
		// `defaultCache` uses concrete names (`pages`, `pages-rsc`,
		// `next-static-js-assets`, `next-image`, `static-image-assets`, ...) that a
		// substring allowlist would miss, leaving stale app-shell/runtime entries.
		// Clearing everything guarantees a clean dev state after a prior prod build.
		if (typeof caches !== "undefined") {
			void caches.keys().then(keys => {
				for (const key of keys) {
					void caches.delete(key)
				}
			})
		}
	}, [])

	if (!isProd) {
		return <>{children}</>
	}

	// No `reloadOnOnline`: that prop force-reloads the current screen on every
	// reconnect, discarding in-memory UI state. Silent update takeover is handled
	// by `skipWaiting` + `clientsClaim` in `app/sw.ts`; refreshed assets apply on
	// the next navigation/load instead of interrupting active work.
	return <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
}
