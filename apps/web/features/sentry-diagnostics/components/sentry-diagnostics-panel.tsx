"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"

import { Button } from "@/core/components/ui/button"
import {
	clientSentryEnvironment,
	isParseableSentryDsn,
	isSentryClientEnabled,
} from "@/core/lib/sentry-config"
import { env } from "@/env"

function StatusRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
			<span className="text-muted-foreground text-sm">{label}</span>
			<span className="font-mono text-sm break-all select-all">{value}</span>
		</div>
	)
}

/**
 * Development-only view of what the browser SDK actually resolved.
 *
 * Values are read back off the live client rather than recomputed from `env`:
 * the release, for instance, is injected by the build plugin and never appears
 * in the environment at all, so a second derivation here would be a guess that
 * disagrees with what is really being sent.
 */
export function SentryDiagnosticsPanel() {
	const [hasThrownTestError, setHasThrownTestError] = useState(false)

	const options = Sentry.getClient()?.getOptions()
	const dsn = env.NEXT_PUBLIC_SENTRY_DSN
	const flagOn = Boolean(env.NEXT_PUBLIC_SENTRY_ENABLED)

	// The two ways this is misconfigured rather than merely off: a flag with no
	// DSN, and a flag with a DSN the SDK cannot parse. Both produce a client that
	// reports nothing while looking enabled.
	const misconfiguration = (() => {
		if (!flagOn) {
			return ""
		}
		if (!dsn) {
			return "NEXT_PUBLIC_SENTRY_ENABLED is set but NEXT_PUBLIC_SENTRY_DSN is empty — nothing is being sent."
		}
		if (!isParseableSentryDsn(dsn)) {
			return "NEXT_PUBLIC_SENTRY_DSN is not a parsable DSN — the SDK will drop every event silently."
		}
		return ""
	})()

	function handleThrowTestError() {
		// Acknowledgement first, and deliberately not derived from the capture: the
		// throw below never returns a value to render, and the UI must not become
		// the thing that proves reporting works.
		setHasThrownTestError(true)

		// A real client crash is an uncaught error, not a hand-rolled
		// `captureException`. Calling the SDK directly would prove only that the
		// transport works; throwing exercises what production actually depends on —
		// the SDK's global error handler, its App Router instrumentation and
		// `beforeSend`.
		//
		// Thrown from a timer so it escapes React's event dispatch and reaches the
		// browser's uncaught-error path intact, instead of being routed straight
		// into an error boundary before the global handler ever sees it.
		setTimeout(() => {
			throw new Error("Sentry diagnostics: deliberate client error from the web app")
		})
	}

	return (
		<div className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-6 p-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold">Sentry diagnostics</h1>
				<p className="text-muted-foreground text-sm">
					Development-only. This route returns 404 in every other environment.
				</p>
			</div>

			{misconfiguration ? (
				<p className="border-destructive/40 text-destructive rounded-md border p-3 text-sm">
					{misconfiguration}
				</p>
			) : null}

			<div className="flex flex-col rounded-md border p-4">
				<StatusRow label="Enabled" value={isSentryClientEnabled ? "yes" : "no"} />
				{/* The live client is the source of truth when there is one; with the
				    SDK disabled there is no client to read, so the same resolved value
				    the init path would have used is shown instead of an em dash. */}
				<StatusRow label="Environment" value={options?.environment ?? clientSentryEnvironment} />
				<StatusRow label="Release" value={options?.release ?? "—"} />
				<StatusRow label="DSN parsed" value={isParseableSentryDsn(dsn) ? "yes" : "no"} />
				<StatusRow label="Traces sample rate" value={String(options?.tracesSampleRate ?? 0)} />
			</div>

			<div className="flex items-center gap-3">
				<Button onClick={handleThrowTestError} disabled={!isSentryClientEnabled}>
					Throw test error
				</Button>
				{hasThrownTestError ? (
					<span className="text-muted-foreground text-xs">
						Thrown — it should appear in Sentry within a few seconds.
					</span>
				) : null}
			</div>
		</div>
	)
}
