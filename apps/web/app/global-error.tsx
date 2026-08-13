"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import * as Sentry from "@sentry/nextjs"

import { Button } from "@/core/components/ui/button"
import { APP_NAME } from "@/core/lib/app-config"
import { isSentryClientEnabled } from "@/core/lib/sentry-config"

import "@/core/styles/globals.css"

/**
 * Report before the browser paints, not after.
 *
 * `useEffect` runs post-paint, so the screen would already be telling the user
 * "our team has been notified" while nothing had been sent yet — and a user who
 * closes the tab on seeing the crash could outrun the report entirely.
 * `useLayoutEffect` runs synchronously after commit and before paint, closing
 * that window; capturing during render instead is not an option, since it would
 * run again on every re-render and once more during SSR, producing an event id
 * that disagrees with the browser's.
 *
 * React has no layout phase on the server and warns when `useLayoutEffect` is
 * used there, so the server falls back to the effect twin — which does nothing
 * either way, because there is no paint to beat.
 */
const useBeforePaintEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * Last-resort crash screen.
 *
 * `global-error` replaces the root layout when rendering fails above it, so it
 * has to supply its own `<html>`/`<body>` and pull in the stylesheet the layout
 * would normally have loaded.
 *
 * The reference code is the whole point of the screen: it is the only thing
 * that connects "the app broke for me at 14:03" to a specific event in Sentry.
 * When reporting is disabled there is no event and therefore no code, so the
 * line is omitted entirely rather than rendered empty — an unfilled "Reference:"
 * is worse than none, because a user will try to quote it.
 */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	const [eventId, setEventId] = useState("")
	const hasCaptured = useRef(false)

	useBeforePaintEffect(() => {
		if (!isSentryClientEnabled || hasCaptured.current) {
			return
		}

		// Guarded by a ref, not just the dependency array: React remounts effects
		// in development Strict Mode, and one crash must not become two events.
		hasCaptured.current = true

		// Setting state from an effect normally risks cascading renders. It does not
		// here: the event id does not exist until the capture has run, and this
		// screen renders exactly once before the user either retries or leaves. The
		// extra render is synchronous and pre-paint, so the reference line is on
		// screen the first time the user sees the crash — never as a second frame.
		setEventId(Sentry.captureException(error))
	}, [error])

	return (
		<html lang="en" suppressHydrationWarning>
			<body className="antialiased">
				<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
					<p className="text-muted-foreground text-sm font-medium">{APP_NAME}</p>
					<h1 className="text-2xl font-bold">Something went wrong</h1>
					<p className="text-muted-foreground">
						Our team has been notified. Try again, or head back home.
					</p>
					{eventId ? (
						<p className="text-muted-foreground font-mono text-xs select-all">
							Reference: {eventId}
						</p>
					) : null}
					<div className="flex items-center justify-center gap-2">
						<Button onClick={reset}>Try again</Button>
						<Button variant="outline" onClick={() => window.location.assign("/")}>
							Go home
						</Button>
					</div>
				</div>
			</body>
		</html>
	)
}
