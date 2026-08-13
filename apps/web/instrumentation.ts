/**
 * Server-side instrumentation entrypoint (Next.js calls `register()` once per
 * server runtime, before any request is handled).
 *
 * The runtime configs are imported dynamically rather than statically: the Node
 * and edge SDKs pull in mutually incompatible dependency trees, and a static
 * import of both would drag the Node build into the edge bundle.
 */

import * as Sentry from "@sentry/nextjs"

export async function register() {
	// `NEXT_RUNTIME` is injected by Next.js to say which runtime is loading this
	// file. It is a compiler marker rather than app configuration, so it stays
	// out of `env.ts` — validating it would assert over a value the framework
	// owns and the operator cannot set.
	// eslint-disable-next-line no-restricted-properties
	const runtime = process.env.NEXT_RUNTIME

	if (runtime === "nodejs") {
		await import("./sentry.server.config")
	}

	if (runtime === "edge") {
		await import("./sentry.edge.config")
	}
}

/**
 * Next.js hands every server-side request error here.
 *
 * Like the client's transition hook, this is exported unconditionally: with no
 * initialized client the capture is a no-op, and a conditional export would
 * make the module shape depend on configuration.
 */
export const onRequestError = Sentry.captureRequestError
