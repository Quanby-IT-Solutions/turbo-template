import { onlineManager } from "@tanstack/react-query"

import { subscribeOnlineStatus } from "./use-online-status"

/**
 * Wires TanStack Query's `onlineManager` to the shared connectivity source.
 *
 * `onlineManager.setEventListener` expects `(setOnline) => cleanup`, which is
 * exactly the signature of `subscribeOnlineStatus` — no adapter needed. When
 * an API origin is configured, paused mutations resume from the health probe.
 * When none is configured, the source is `navigator.onLine` and no probe runs.
 *
 * Client-only: no-ops on the server.
 */
export function setupOnlineManagerBridge() {
	if (typeof window === "undefined") return

	onlineManager.setEventListener(onOnline => subscribeOnlineStatus(onOnline))
}
