"use client"

import * as React from "react"

import { loadedPosthog, loadPosthog } from "@/core/lib/posthog-client"
import { isPosthogClientEnabled } from "@/core/lib/posthog-config"

/**
 * The two PostHog calls a flag read needs; the real client satisfies it and
 * tests pass a stand-in (the SDK's own overloads cannot be mocked as typed).
 */
export interface FlagClient {
	isFeatureEnabled(key: string): boolean | undefined
	onFeatureFlags(callback: () => void): () => void
}

const noopSubscribe = () => () => {}

/**
 * Whether the PostHog flag `key` is on for this visitor.
 *
 * Off when analytics is off, before flags have loaded, or when PostHog does not
 * know the flag: a flag can only add behaviour. Re-renders when PostHog loads
 * or reloads flags (for example after sign-in), so a change made in the
 * PostHog dashboard shows on the next page load without any extra wiring.
 * Always off during server rendering, so the server HTML never depends on it.
 */
export function useFeatureFlag(
	key: string,
	client?: FlagClient,
	enabled: boolean = isPosthogClientEnabled
): boolean {
	// The lazily loaded SDK when no client is passed; re-renders once it arrives.
	const [lazy, setLazy] = React.useState<FlagClient | undefined>(() => loadedPosthog())
	React.useEffect(() => {
		if (client || lazy || !enabled) return
		let live = true
		void loadPosthog().then(loaded => {
			if (live && loaded) setLazy(loaded)
		})
		return () => {
			live = false
		}
	}, [client, lazy, enabled])
	const active = client ?? lazy

	const subscribe = React.useCallback(
		(onChange: () => void) =>
			enabled && active ? active.onFeatureFlags(() => onChange()) : noopSubscribe(),
		[active, enabled]
	)
	const read = () => enabled && active?.isFeatureEnabled(key) === true

	return React.useSyncExternalStore(subscribe, read, () => false)
}
