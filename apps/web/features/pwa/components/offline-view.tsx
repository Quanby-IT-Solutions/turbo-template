"use client"

import { useEffect, useRef } from "react"

import { Button } from "@/core/components/ui/button"
import { APP_NAME } from "@/core/lib/app-config"
import { useOnlineStatus } from "@/features/pwa/lib/use-online-status"

export function OfflineView() {
	const isOnline = useOnlineStatus()
	const hasSeenOffline = useRef<boolean>(false)
	const hasAutoRetried = useRef<boolean>(false)

	// Auto-reload once connectivity returns, so the user lands back on the real
	// route instead of the offline fallback. `useOnlineStatus` starts optimistic
	// (`true`), so we only arm the retry after actually observing offline first —
	// otherwise the initial `true` would trigger an immediate reload loop.
	useEffect(() => {
		if (!isOnline) {
			hasSeenOffline.current = true
			return
		}

		if (hasSeenOffline.current && !hasAutoRetried.current) {
			hasAutoRetried.current = true
			window.location.reload()
		}
	}, [isOnline])

	function handleRetry() {
		window.location.reload()
	}

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
			<p className="text-muted-foreground text-sm font-medium">{APP_NAME}</p>
			<h1 className="text-2xl font-bold">You&apos;re offline</h1>
			<p className="text-muted-foreground">Check your connection and try again.</p>
			<div className="flex items-center justify-center gap-2">
				<span className={`size-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
				<span className="text-sm">{isOnline ? "Online" : "Offline"}</span>
			</div>
			<Button onClick={handleRetry}>Retry</Button>
		</div>
	)
}
