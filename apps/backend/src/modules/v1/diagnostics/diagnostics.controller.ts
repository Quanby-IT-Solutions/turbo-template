import { Controller, Get, Post } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"

import { getSentryDiagnostics, type SentryDiagnostics } from "@/instrument"

/**
 * Development-only Sentry diagnostics.
 *
 * Answers the two questions that otherwise cost an afternoon: "is Sentry
 * actually on in this process?" and "does an error really reach the dashboard
 * from here?".
 *
 * Availability is structural, not merely guarded: `V1Module` imports
 * `DiagnosticsModule` only when NODE_ENV is development, so outside development
 * these routes are not registered at all and 404 — there is no auth check to
 * misconfigure and no handler to reach.
 *
 * Plain `@Get`/`@Post` rather than the oRPC `@Implement` used elsewhere: these
 * are not part of the public API surface and deliberately have no contract in
 * `@repo/contracts`. The explicit `version: "1"` is required because
 * `enableVersioning` is configured without a `defaultVersion` (bootstrap.ts),
 * so an unversioned controller would land on `/api/diagnostics`.
 */
@Controller({ path: "diagnostics", version: "1" })
export class DiagnosticsController {
	/**
	 * GET /api/v1/diagnostics/sentry
	 *
	 * Reports resolved state only. The DSN is never echoed — `dsnParsed` says
	 * whether it was usable, which is the part worth knowing.
	 */
	@AllowAnonymous()
	@Get("sentry")
	getSentryStatus(): SentryDiagnostics {
		return getSentryDiagnostics()
	}

	/**
	 * POST /api/v1/diagnostics/sentry/test-error
	 *
	 * Throws a plain `Error` — NOT an `HttpException` — and lets it propagate
	 * uncaught, so it travels the exact path a real bug would: through
	 * SentryExceptionFilter, which captures it and renders the uniform 500. The
	 * point is to exercise the production capture path rather than a shortcut
	 * that would still "work" if that path were broken.
	 */
	@AllowAnonymous()
	@Post("sentry/test-error")
	triggerTestError(): never {
		throw new Error("Sentry diagnostics test error (deliberate, development only)")
	}
}
