"use client"

import React from "react"
import { SerwistProvider } from "@serwist/turbopack/react"
import { toast } from "sonner"

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
	// reconnect, discarding in-memory UI state.
	return (
		<SerwistProvider swUrl="/serwist/sw.js">
			<ServiceWorkerUpdatePrompt />
			{children}
		</SerwistProvider>
	)
}

/**
 * Offers the user a reload when a new service worker is waiting (WC-4 / F-49).
 *
 * `app/sw.ts` no longer sets `skipWaiting`, so a newly-installed worker sits in
 * `waiting` instead of swapping the code under an open tab. This is the piece
 * that makes that deliberate rather than merely deferred: it detects the
 * waiting worker, asks, and only then tells it to activate.
 */
function ServiceWorkerUpdatePrompt() {
	React.useEffect(() => {
		if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

		let cancelled = false

		const offer = (registration: ServiceWorkerRegistration) => {
			const waiting = registration.waiting
			if (!waiting || cancelled) return

			toast("A new version is available.", {
				id: "sw-update",
				duration: Infinity,
				action: {
					label: "Reload",
					onClick: () => {
						// The worker activates only now, with the user's consent.
						waiting.postMessage({ type: "SKIP_WAITING" })
					},
				},
			})
		}

		void navigator.serviceWorker.getRegistration().then(registration => {
			if (!registration || cancelled) return

			offer(registration)
			registration.addEventListener("updatefound", () => {
				const installing = registration.installing
				installing?.addEventListener("statechange", () => {
					if (installing.state === "installed") offer(registration)
				})
			})
		})

		// Reload once the new worker has taken control, so every open tab lands
		// on the same version rather than a mix of old and new chunks.
		const onControllerChange = () => {
			if (!cancelled) window.location.reload()
		}
		navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

		return () => {
			cancelled = true
			navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
		}
	}, [])

	return null
}

/**
 * Unregister every service worker and delete every cache for this origin
 * (WC-4 / F-49).
 *
 * The existing self-heal returns early in production, so a bad worker shipped
 * to production could not be recovered from in the browser at all — the user
 * had to know to clear site data manually. This works in every environment and
 * is exported so a support page or console can call it.
 *
 * Deletes ALL caches rather than an allowlist: Serwist's defaultCache uses
 * concrete names (`pages`, `pages-rsc`, `next-static-js-assets`, `next-image`,
 * ...) that a substring match would miss, leaving exactly the stale app-shell
 * entries the recovery exists to clear.
 */
export async function resetServiceWorker(): Promise<void> {
	if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

	const registrations = await navigator.serviceWorker.getRegistrations()
	await Promise.all(registrations.map(registration => registration.unregister()))

	if (typeof caches !== "undefined") {
		const keys = await caches.keys()
		await Promise.all(keys.map(key => caches.delete(key)))
	}
}
