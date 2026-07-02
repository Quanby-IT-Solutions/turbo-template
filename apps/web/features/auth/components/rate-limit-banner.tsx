interface RateLimitBannerProps {
	message: string
	secondsLeft: number | null
}

// Presentational rate-limit banner reusing the shared auth error banner styling.
// The rendered text is derived from the LIVE countdown state, never the original
// parsed retry hint, so it cannot go stale:
//   - `secondsLeft > 0`   → live "try again in N seconds" copy
//   - `secondsLeft === 0` → window elapsed, non-misleading retry cue
//   - `secondsLeft === null` → no retry window advertised, generic `message`
export function RateLimitBanner({ message, secondsLeft }: RateLimitBannerProps) {
	const text =
		secondsLeft === null
			? message
			: secondsLeft > 0
				? `Too many attempts. Please try again in ${secondsLeft} seconds.`
				: "You can try again now."

	return (
		<div className="bg-destructive/10 text-destructive dark:bg-destructive/20 rounded-lg p-3 text-sm">
			{text}
		</div>
	)
}
