"use client"

import * as React from "react"

import { env } from "@/env"

/**
 * First-party connectivity probe (WC-4 / F-50, brought forward by ED-1).
 *
 * This used to hit `https://www.gstatic.com/generate_204`, which leaked the
 * user's IP and session duration to a third party every 15 seconds. ED-1's CSP
 * then made that actively harmful rather than merely leaky: `connect-src` does
 * not allow gstatic, so the probe throws, the app concludes it is offline, and
 * `networkMode: "online"` pauses **every** mutation indefinitely — todos never
 * send, sign-out hangs on "Logging out…". The failure is timing-dependent
 * because the state starts optimistic and only flips once the first probe
 * fails, which is what made it look like flakiness.
 *
 * `/health` is `@AllowAnonymous`, so the probe works signed-out, and it is on
 * the API origin the CSP already allows.
 */
const PROBE_URL = `${env.NEXT_PUBLIC_API_BASE_URL}/${env.NEXT_PUBLIC_API_VERSION}/health`

// --- Shared, module-scoped connectivity source -----------------------------
//
// `navigator.onLine` alone is unreliable: it only reports whether the machine
// has *a* network interface, not whether the internet is actually reachable
// (localhost dev server, LAN/VPN/ethernet with no uplink all read `true`). So we
// combine it with an active probe to an external host, driven by the
// `online`/`offline` events plus a periodic poll.
//
// The probe machinery is module-scoped and shared across all subscribers: a
// single probe loop runs while at least one subscriber is registered, and every
// update fans out to all of them. This guarantees there is never more than one
// active probe (no doubled background traffic, no inconsistent notifications).

const listeners = new Set<(online: boolean) => void>()

// Last known connectivity state. Starts optimistic (`true`) so SSR/first render
// matches, then reconciles on the first probe.
let currentOnline = true

// Loop state. `cancelled` gates in-flight probes; `interval`/`handleProbe` are
// the shared timer and event-listener reference, non-null only while running.
let cancelled = false
let interval: ReturnType<typeof setInterval> | null = null
let handleProbe: (() => void) | null = null

function emit(online: boolean) {
	currentOnline = online
	for (const listener of listeners) listener(online)
}

async function probe() {
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		if (!cancelled) emit(false)
		return
	}

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 5000)

	try {
		await fetch(`${PROBE_URL}?t=${Date.now()}`, {
			method: "GET",
			mode: "no-cors",
			cache: "no-store",
			signal: controller.signal,
		})
		if (!cancelled) emit(true)
	} catch {
		if (!cancelled) emit(false)
	} finally {
		clearTimeout(timeout)
	}
}

function startProbeLoop() {
	cancelled = false
	// Stable non-async handler so add/removeEventListener share one reference
	// and no floating promise leaks to the event system.
	handleProbe = () => void probe()

	handleProbe()

	interval = setInterval(handleProbe, 15000)
	window.addEventListener("online", handleProbe)
	window.addEventListener("offline", handleProbe)
}

function stopProbeLoop() {
	cancelled = true

	if (interval !== null) {
		clearInterval(interval)
		interval = null
	}

	if (handleProbe) {
		window.removeEventListener("online", handleProbe)
		window.removeEventListener("offline", handleProbe)
		handleProbe = null
	}
}

/**
 * Subscribes to the shared connectivity source, invoking `callback` with the
 * current online state and on every subsequent change. The subscriber receives
 * the last known state immediately.
 *
 * The single shared probe loop (initial probe, periodic poll, `online`/`offline`
 * listeners) starts when the first subscriber arrives and is torn down when the
 * last one leaves. Returns an unsubscribe function.
 *
 * Shared by `useOnlineStatus` and the TanStack Query `onlineManager` bridge so a
 * single probe drives both.
 */
export function subscribeOnlineStatus(callback: (online: boolean) => void): () => void {
	listeners.add(callback)

	// Hand the new subscriber the last known state right away.
	callback(currentOnline)

	// Start the shared loop only when the first subscriber arrives.
	if (listeners.size === 1) startProbeLoop()

	return () => {
		listeners.delete(callback)

		// Tear the shared loop down once nobody is listening.
		if (listeners.size === 0) stopProbeLoop()
	}
}

/**
 * Tracks live network connectivity.
 *
 * Thin wrapper over `subscribeOnlineStatus`. Starts optimistic (`true`) so
 * SSR/first render matches, then reconciles on mount before the UI settles.
 */
export function useOnlineStatus() {
	const [isOnline, setIsOnline] = React.useState<boolean>(true)

	React.useEffect(() => subscribeOnlineStatus(setIsOnline), [])

	return isOnline
}
