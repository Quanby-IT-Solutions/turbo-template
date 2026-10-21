/**
 * Whether the persisted query cache is still being restored.
 *
 * `SerwistRegistrationProvider` sits outside `QueryProvider`, so it cannot
 * read `useIsRestoring()`. The flush before an update reload checks this
 * flag instead. It starts false: a flush that runs with no provider mounted
 * (tests, and any call before the client provider renders) writes as usual.
 * The provider marks restoring on its first client render and clears the
 * flag when restore succeeds or fails, including when there is no snapshot.
 */

let restoring = false

export function markPersistedCacheRestoring(): void {
	restoring = true
}

export function markPersistedCacheRestored(): void {
	restoring = false
}

export function isPersistedCacheRestoring(): boolean {
	return restoring
}
