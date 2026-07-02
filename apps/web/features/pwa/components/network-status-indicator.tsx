"use client"

import * as React from "react"
import { Wifi01Icon, WifiDisconnected01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useIsMutating, useMutationState } from "@tanstack/react-query"

import { useOnlineStatus } from "@/features/pwa/lib/use-online-status"

/**
 * Global connectivity indicator.
 *
 * Fixed badge in the top-right corner, mounted once in the root layout so it is
 * visible on every route.
 *
 * - Offline: persistent red badge until the connection returns.
 * - Offline with queued writes: red badge showing how many todo changes wait.
 * - Reconnecting: green "Syncing N changes" badge while the queued writes replay.
 * - Reconnected: green "Back online" badge shown briefly, then auto-hides.
 * - Steady online: renders nothing. Normal online actions do NOT show a badge —
 *   syncing only appears for offline-queued writes replaying after a reconnect.
 */
export function NetworkStatusIndicator() {
	const isOnline = useOnlineStatus()
	const wasOffline = React.useRef<boolean>(false)
	// Set on an offline→online transition; drives the syncing/back-online flow.
	// Without it, a plain online mutation would light up the badge too.
	const reconnecting = React.useRef<boolean>(false)
	const prevSyncingCount = React.useRef<number>(0)
	const [phase, setPhase] = React.useState<"idle" | "syncing" | "reconnected">("idle")

	// Paused todo mutations waiting for connectivity (offline-queued writes).
	const pausedFlags = useMutationState({
		filters: { mutationKey: ["todos"], status: "pending" },
		select: mutation => mutation.state.isPaused,
	})
	const queuedCount = pausedFlags.filter(Boolean).length

	// Todo mutations actively executing right now.
	const syncingCount = useIsMutating({ mutationKey: ["todos"] })

	React.useEffect(() => {
		if (!isOnline) {
			wasOffline.current = true
			reconnecting.current = false
			setPhase("idle")
			return
		}

		// Only act on the offline→online edge.
		if (wasOffline.current) {
			wasOffline.current = false

			// Queued/replaying writes → show syncing until it drains. Otherwise flash
			// "Back online" straight away.
			if (queuedCount > 0 || syncingCount > 0) {
				reconnecting.current = true
				setPhase("syncing")
			} else {
				setPhase("reconnected")
			}
		}
	}, [isOnline, queuedCount, syncingCount])

	// Flash "Back online" once the deferred replay finishes (syncing count drops
	// from a positive value back to zero). Guarded by `reconnecting` so fresh
	// online mutations never trigger it.
	React.useEffect(() => {
		const previous = prevSyncingCount.current
		prevSyncingCount.current = syncingCount

		if (reconnecting.current && previous > 0 && syncingCount === 0) {
			reconnecting.current = false
			setPhase("reconnected")
		}
	}, [syncingCount])

	// Auto-hide the reconnected confirmation after a brief window.
	React.useEffect(() => {
		if (phase !== "reconnected") {
			return
		}

		const timeout = setTimeout(() => setPhase("idle"), 3000)
		return () => clearTimeout(timeout)
	}, [phase])

	// Steady online with nothing to report → render nothing.
	if (isOnline && phase === "idle") {
		return null
	}

	let label: string
	if (!isOnline) {
		label =
			queuedCount > 0
				? `Offline · ${queuedCount} queued change${queuedCount === 1 ? "" : "s"}`
				: "Offline"
	} else if (phase === "syncing") {
		label = `Syncing ${syncingCount} change${syncingCount === 1 ? "" : "s"}`
	} else {
		label = "Back online"
	}

	return (
		<div
			role="status"
			aria-live="polite"
			className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white shadow-lg transition-colors ${
				isOnline ? "bg-emerald-600" : "bg-destructive"
			}`}
		>
			<HugeiconsIcon
				icon={isOnline ? Wifi01Icon : WifiDisconnected01Icon}
				strokeWidth={2}
				className="size-4"
			/>
			<span>{label}</span>
		</div>
	)
}
