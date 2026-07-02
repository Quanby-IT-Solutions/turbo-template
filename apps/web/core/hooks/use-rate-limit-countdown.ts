"use client"

import { useEffect, useState } from "react"

// Drives a once-per-second countdown from `retryAfter` (seconds). When
// `retryAfter` is null/<=0, the countdown is inactive. The interval clears on
// reaching zero or on unmount.
export function useRateLimitCountdown(retryAfter: number | null): {
	secondsLeft: number | null
	isActive: boolean
} {
	const initial = retryAfter && retryAfter > 0 ? retryAfter : null
	const [prevRetryAfter, setPrevRetryAfter] = useState(retryAfter)
	const [secondsLeft, setSecondsLeft] = useState<number | null>(initial)

	// Reset the countdown during render when a new retryAfter arrives (React's
	// recommended alternative to resetting state inside an effect).
	if (retryAfter !== prevRetryAfter) {
		setPrevRetryAfter(retryAfter)
		setSecondsLeft(initial)
	}

	useEffect(() => {
		if (!retryAfter || retryAfter <= 0) return

		const interval = setInterval(() => {
			setSecondsLeft(prev => {
				if (prev === null || prev <= 1) {
					clearInterval(interval)
					return 0
				}
				return prev - 1
			})
		}, 1000)

		return () => clearInterval(interval)
	}, [retryAfter])

	return { secondsLeft, isActive: secondsLeft !== null && secondsLeft > 0 }
}
