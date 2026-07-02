import { onlineManager } from "@tanstack/react-query"

import { subscribeOnlineStatus } from "./use-online-status"

/**
 * Wires TanStack Query's `onlineManager` to the app's active connectivity probe.
 *
 * `onlineManager.setEventListener` expects `(setOnline) => cleanup`, which is
 * exactly the signature of `subscribeOnlineStatus` — no adapter needed. This
 * makes Query's paused-mutation resume logic react to real reachability instead
 * of the unreliable `navigator.onLine` flag alone.
 *
 * Client-only: no-ops on the server.
 */
export function setupOnlineManagerBridge() {
	if (typeof window === "undefined") return

	onlineManager.setEventListener(onOnline => subscribeOnlineStatus(onOnline))
}
