/**
 * Decide when a `controllerchange` should reload the tab.
 *
 * The first worker on a visit activates immediately and `clientsClaim` fires
 * `controllerchange`. That is not an update: reloading here drops whatever the
 * user just did. A later change, or a change the user accepted from the
 * update toast, is an update and reloads once.
 */

/** The flush before an update reload cannot hold the reload longer than this. */
export const RELOAD_FLUSH_CAP_MS = 1000

export function createControllerChangeHandler(options: {
	initiallyControlled: boolean
	beforeReload: () => Promise<unknown> | unknown
	reload: () => void
}): {
	onControllerChange: () => void
	markAccepted: () => void
} {
	let controlled = options.initiallyControlled
	let accepted = false
	let reloading = false

	const runReload = async () => {
		if (reloading) return
		reloading = true

		await Promise.race([
			Promise.resolve()
				.then(() => options.beforeReload())
				.catch(() => undefined),
			new Promise<void>(resolve => {
				setTimeout(resolve, RELOAD_FLUSH_CAP_MS)
			}),
		])

		options.reload()
	}

	return {
		onControllerChange() {
			// Uncontrolled and not accepted: this is the first claim.
			if (!controlled && !accepted) {
				controlled = true
				return
			}

			void runReload()
		},
		markAccepted() {
			accepted = true
		},
	}
}
