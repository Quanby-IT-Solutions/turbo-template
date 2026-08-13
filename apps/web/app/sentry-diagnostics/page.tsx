import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SentryDiagnosticsPanel } from "@/features/sentry-diagnostics/components/sentry-diagnostics-panel"
import { env } from "@/env"

export const metadata: Metadata = {
	title: "Sentry diagnostics",
}

/**
 * Development-only route.
 *
 * The `notFound()` runs at build time for a production build, so the page is
 * not merely hidden — it is never emitted. Keeping the check here rather than
 * inside the panel means the component stays a plain client component and the
 * gate cannot be bypassed by rendering it from somewhere else.
 */
export default function SentryDiagnosticsPage() {
	if (env.NODE_ENV !== "development") {
		notFound()
	}

	return <SentryDiagnosticsPanel />
}
