/**
 * Whether the persisted query cache is still being restored.
 *
 * `SerwistRegistrationProvider` sits outside `QueryProvider`, so it cannot
 * read `useIsRestoring()`. The flush before an update reload checks this
 * flag instead. It starts false: a flush that runs with no provider mounted
 * (tests, and any call before the client provider renders) writes as usual.
 * The provider marks restoring on its first client render and clears the
 * flag when restore succeeds or fails, including when there is no snapshot.
 *
 * There is no restore timeout. A timed-out restore makes the library delete
 * or overwrite the stored snapshot: hydration runs inside the restore, so a
 * late result cannot be ignored. While the flag is true, writes are skipped.
 *
 * In dev, Fast Refresh re-runs this module and resets the flag while the provider stays armed, so a flush can run during a restore; there is no production effect.
 */

/** How long a restore may run before a single warning. The flag stays set. */
export const PERSISTED_CACHE_RESTORE_WARN_MS = 10_000

const PERSISTED_CACHE_RESTORE_WARN_MESSAGE =
	"Restoring the offline cache is taking longer than expected. Changes on this page won't be saved to the offline cache until it finishes."

let restoring = false
let warnTimer: ReturnType<typeof setTimeout> | undefined

export function markPersistedCacheRestoring(): void {
	restoring = true
	// One timer for this restore. Arming again does not start a second one.
	if (warnTimer !== undefined) return
	warnTimer = setTimeout(() => {
		if (!restoring) return
		// eslint-disable-next-line no-console
		console.warn(PERSISTED_CACHE_RESTORE_WARN_MESSAGE)
	}, PERSISTED_CACHE_RESTORE_WARN_MS)
}

export function markPersistedCacheRestored(): void {
	restoring = false
	if (warnTimer !== undefined) {
		clearTimeout(warnTimer)
		warnTimer = undefined
	}
}

export function isPersistedCacheRestoring(): boolean {
	return restoring
}
