"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

import { useRateLimitCountdown } from "@/core/hooks/use-rate-limit-countdown"
import { parseRateLimitError } from "@/core/lib/rate-limit-utils"

// Detects a 429 in `error`, drives a once-per-second countdown, and renders a
// single toast whose remaining-seconds text updates live. Returns the countdown
// state so the triggering control (button/checkbox/select) can stay disabled
// until the retry window elapses. Pass a unique `toastId` per action so parallel
// rate-limited actions do not collapse into one toast.
export function useRateLimitToast(
	error: unknown,
	options: { toastId: string }
): { isActive: boolean; secondsLeft: number | null } {
	const rateLimit = parseRateLimitError(error)
	const { secondsLeft, isActive } = useRateLimitCountdown(
		rateLimit.isRateLimit ? rateLimit.retryAfter : null
	)

	const { toastId } = options
	const shownRef = useRef(false)

	useEffect(() => {
		if (!rateLimit.isRateLimit) {
			if (shownRef.current) {
				toast.dismiss(toastId)
				shownRef.current = false
			}
			return
		}

		const text =
			secondsLeft && secondsLeft > 0
				? `Too many attempts. Please try again in ${secondsLeft} seconds.`
				: "Too many attempts. Please try again shortly."

		toast.error(text, { id: toastId, duration: isActive ? Infinity : 4000 })
		shownRef.current = true
	}, [rateLimit.isRateLimit, secondsLeft, isActive, toastId])

	return { isActive, secondsLeft }
}
