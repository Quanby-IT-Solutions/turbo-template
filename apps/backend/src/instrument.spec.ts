import type * as Instrument from "@/instrument"

const mockInit = jest.fn()
const mockCaptureException = jest.fn()

jest.mock("@sentry/nestjs", () => ({
	init: (...args: unknown[]) => mockInit(...args),
	captureException: (...args: unknown[]) => mockCaptureException(...args),
}))

type InitOptions = {
	dsn?: string
	environment?: string
	release?: string
	tracesSampleRate?: number
	sendDefaultPii?: boolean
	beforeSend: (event: Record<string, unknown>) => Record<string, unknown>
	beforeBreadcrumb: (breadcrumb: Record<string, unknown>) => Record<string, unknown>
	tracesSampler: (context: {
		name: string
		attributes?: Record<string, unknown>
		inheritOrSampleWith: (fallback: number) => number
	}) => number
}

/**
 * Load `src/instrument.ts` fresh against a synthetic environment.
 *
 * The module initialises Sentry as an import side effect (it has to — the SDK
 * must patch http/express before they are loaded), so each case resets the
 * module registry and re-requires it rather than calling a function.
 */
function loadInstrument(overrides: Record<string, string | undefined>) {
	const original = process.env

	process.env = {
		...original,
		SENTRY_ENABLED: undefined,
		SENTRY_DSN: undefined,
		SENTRY_ENVIRONMENT: undefined,
		SENTRY_TRACES_SAMPLE_RATE: undefined,
		IMAGE_TAG: undefined,
		...overrides,
	} as NodeJS.ProcessEnv

	try {
		jest.resetModules()
		return require("@/instrument") as typeof Instrument
	} finally {
		process.env = original
	}
}

const VALID_DSN = "https://abc123@o4507.ingest.sentry.io/1234567"

describe("instrument (Sentry bootstrap)", () => {
	let warnSpy: jest.SpyInstance
	let logSpy: jest.SpyInstance

	beforeEach(() => {
		mockInit.mockClear()
		mockCaptureException.mockClear()
		warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)
		logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined)
	})

	afterEach(() => {
		warnSpy.mockRestore()
		logSpy.mockRestore()
	})

	describe("enablement", () => {
		it("stays off when neither the flag nor a DSN is set", () => {
			const instrument = loadInstrument({})

			expect(mockInit).not.toHaveBeenCalled()
			expect(instrument.getSentryDiagnostics()).toMatchObject({ enabled: false, dsnParsed: false })
			expect(warnSpy).not.toHaveBeenCalled()
		})

		// A DSN parked in the environment is not consent to start shipping events.
		it("stays off when a valid DSN is present but the flag is not true", () => {
			loadInstrument({ SENTRY_DSN: VALID_DSN })

			expect(mockInit).not.toHaveBeenCalled()
			expect(warnSpy).not.toHaveBeenCalled()
		})

		it("treats a truthy-looking value that is not exactly `true` as off", () => {
			loadInstrument({ SENTRY_ENABLED: "1", SENTRY_DSN: VALID_DSN })

			expect(mockInit).not.toHaveBeenCalled()
		})

		// An unfinished deployment: flag flipped, DSN never filled in. Events were
		// meant to be shipped somewhere, so this is a misconfiguration worth one
		// actionable warning — same treatment as a malformed DSN.
		it("stays off and warns when the flag is on but the DSN is empty", () => {
			const instrument = loadInstrument({ SENTRY_ENABLED: "true", SENTRY_DSN: "   " })

			expect(mockInit).not.toHaveBeenCalled()
			expect(warnSpy).toHaveBeenCalledTimes(1)

			const { warning } = instrument.getSentryDiagnostics()
			expect(warning).toContain("SENTRY_DSN")
			// The warning has to be actionable, not just a complaint.
			expect(warning).toContain("SENTRY_ENABLED")
		})

		it("initialises only when the flag and a valid DSN are both supplied", () => {
			const instrument = loadInstrument({
				SENTRY_ENABLED: "true",
				SENTRY_DSN: VALID_DSN,
				SENTRY_ENVIRONMENT: "staging",
				SENTRY_TRACES_SAMPLE_RATE: "0.25",
				IMAGE_TAG: "sha-abc1234",
			})

			expect(mockInit).toHaveBeenCalledTimes(1)
			expect(mockInit.mock.calls[0]?.[0]).toMatchObject({
				dsn: VALID_DSN,
				environment: "staging",
				release: "sha-abc1234",
				tracesSampleRate: 0.25,
				sendDefaultPii: false,
			})
			expect(instrument.getSentryDiagnostics()).toMatchObject({
				enabled: true,
				environment: "staging",
				release: "sha-abc1234",
				dsnParsed: true,
			})
		})

		it("falls back to NODE_ENV for the environment and 0 for the sample rate", () => {
			loadInstrument({ SENTRY_ENABLED: "true", SENTRY_DSN: VALID_DSN, NODE_ENV: "production" })

			expect(mockInit.mock.calls[0]?.[0]).toMatchObject({
				environment: "production",
				tracesSampleRate: 0,
			})
		})
	})

	describe("malformed DSN", () => {
		// A mistyped observability credential must never be able to stop the
		// service it was installed to observe.
		it.each([
			["not-a-url", "not-a-url"],
			["missing public key", "https://o4507.ingest.sentry.io/1234567"],
			["missing project id", "https://abc123@o4507.ingest.sentry.io"],
			["placeholder left in .env", "<your-sentry-dsn>"],
		])("warns once and does not initialise: %s", (_label, dsn) => {
			const instrument = loadInstrument({ SENTRY_ENABLED: "true", SENTRY_DSN: dsn })

			expect(mockInit).not.toHaveBeenCalled()
			expect(warnSpy).toHaveBeenCalledTimes(1)

			const diagnostics = instrument.getSentryDiagnostics()
			expect(diagnostics.enabled).toBe(false)
			expect(diagnostics.dsnParsed).toBe(false)
			expect(diagnostics.warning).toContain("SENTRY_DSN")
			// The warning has to be actionable, not just a complaint.
			expect(diagnostics.warning).toContain("SENTRY_ENABLED")
		})

		it("never leaks the configured DSN through the diagnostics payload", () => {
			const instrument = loadInstrument({ SENTRY_ENABLED: "true", SENTRY_DSN: VALID_DSN })

			expect(JSON.stringify(instrument.getSentryDiagnostics())).not.toContain("abc123")
		})
	})

	// The disabled path is the default one every developer boots on: it has to
	// look exactly like it did before Sentry existed, or the "no-op when off"
	// guarantee is only true of the network traffic and not of the console.
	describe("development startup logging", () => {
		it("prints nothing when Sentry is disabled", () => {
			loadInstrument({ NODE_ENV: "development" })

			expect(mockInit).not.toHaveBeenCalled()
			expect(logSpy).not.toHaveBeenCalled()
			expect(warnSpy).not.toHaveBeenCalled()
		})

		it("prints exactly one warning and no extra output when the DSN is missing", () => {
			loadInstrument({ NODE_ENV: "development", SENTRY_ENABLED: "true", SENTRY_DSN: "   " })

			expect(warnSpy).toHaveBeenCalledTimes(1)
			expect(logSpy).not.toHaveBeenCalled()
		})

		// One clear, actionable warning — not a warning plus a diagnostics line
		// advertising an endpoint that will report Sentry as off.
		it("prints exactly one warning and no extra output for a malformed DSN", () => {
			loadInstrument({ NODE_ENV: "development", SENTRY_ENABLED: "true", SENTRY_DSN: "not-a-url" })

			expect(warnSpy).toHaveBeenCalledTimes(1)
			expect(logSpy).not.toHaveBeenCalled()
		})

		it("confirms enablement once, with the resolved environment, release and route", () => {
			loadInstrument({
				NODE_ENV: "development",
				SENTRY_ENABLED: "true",
				SENTRY_DSN: VALID_DSN,
				SENTRY_ENVIRONMENT: "local-dev",
				IMAGE_TAG: "sha-abc1234",
				PORT: "4001",
			})

			expect(logSpy).toHaveBeenCalledTimes(1)

			const line = String(logSpy.mock.calls[0]?.[0])
			expect(line).toContain("http://localhost:4001/api/v1/diagnostics/sentry")
			expect(line).toContain("local-dev")
			expect(line).toContain("sha-abc1234")
			// A confirmation nobody can misread as "configured but inert".
			expect(line).toContain("enabled")
			// The confirmation must not become a second place the DSN is printed.
			expect(line).not.toContain("abc123@")
		})

		it("stays silent outside development even when Sentry initialises", () => {
			loadInstrument({ NODE_ENV: "production", SENTRY_ENABLED: "true", SENTRY_DSN: VALID_DSN })

			expect(mockInit).toHaveBeenCalledTimes(1)
			expect(logSpy).not.toHaveBeenCalled()
		})
	})

	describe("scrubbing", () => {
		function initOptions(): InitOptions {
			loadInstrument({ SENTRY_ENABLED: "true", SENTRY_DSN: VALID_DSN })
			return mockInit.mock.calls[0]?.[0] as InitOptions
		}

		// LG-1 / F-05 extended to the error sink: what pino refuses to log, Sentry
		// must refuse to send. Both read the same deny-list from @repo/observability.
		it("strips deny-listed headers, cookies and body fields from an event", () => {
			const scrubbed = initOptions().beforeSend({
				request: {
					url: "/api/v1/auth/verify-email?token=live-token&callbackURL=/home",
					headers: {
						"authorization": "Bearer live-access-token",
						"Cookie": "better-auth.session_token=live-session",
						"user-agent": "jest",
					},
					cookies: { "better-auth.session_token": "live-session" },
					query_string: "token=live-token&foo=bar",
					data: {
						email: "person@example.com",
						password: "hunter2",
						keep: "ok",
						payload: { token: "live-token", newPassword: "hunter3", keep: "ok" },
					},
				},
			})

			const request = (scrubbed as { request: Record<string, any> }).request

			expect(request.headers).toEqual({ "user-agent": "jest" })
			// The parsed twin of a removed header must not survive either.
			expect(request.cookies).toBeUndefined()
			expect(request.url).toBe("/api/v1/auth/verify-email?token=[REDACTED]&callbackURL=/home")
			expect(request.query_string).toBe("token=[REDACTED]&foo=bar")
			expect(request.data).toEqual({ keep: "ok", payload: { keep: "ok" } })

			// Belt and braces: nothing sensitive anywhere in the serialized event.
			const serialized = JSON.stringify(scrubbed)
			expect(serialized).not.toContain("person@example.com")
			expect(serialized).not.toContain("hunter2")
			expect(serialized).not.toContain("hunter3")
			expect(serialized).not.toContain("live-token")
			expect(serialized).not.toContain("live-session")
			expect(serialized).not.toContain("live-access-token")
		})

		it("handles the object and pair-array forms of query_string", () => {
			const options = initOptions()

			const asObject = options.beforeSend({
				request: { query_string: { token: "live-token", foo: "bar" } },
			})
			expect((asObject as { request: Record<string, any> }).request.query_string).toEqual({
				token: "[REDACTED]",
				foo: "bar",
			})

			const asPairs = options.beforeSend({
				request: {
					query_string: [
						["token", "live-token"],
						["foo", "bar"],
					],
				},
			})
			expect((asPairs as { request: Record<string, any> }).request.query_string).toEqual([
				["token", "[REDACTED]"],
				["foo", "bar"],
			])
		})

		it("leaves an event without a request untouched", () => {
			const event = { message: "boom" }

			expect(initOptions().beforeSend({ ...event })).toEqual(event)
		})

		it("scrubs breadcrumb data and URLs", () => {
			const scrubbed = initOptions().beforeBreadcrumb({
				category: "http",
				data: {
					url: "/api/v1/auth/reset-password?token=live-token",
					password: "hunter2",
					status_code: 200,
				},
			})

			expect((scrubbed as { data: Record<string, unknown> }).data).toEqual({
				url: "/api/v1/auth/reset-password?token=[REDACTED]",
				status_code: 200,
			})
		})

		// A breadcrumb that records the query as a parsed object is the one shape
		// `sanitizeLogUrl` cannot see. `state`, `code` and the OAuth tokens are
		// credentials only as query parameters, so they are absent from the
		// structured-field deny-list and would otherwise be exported verbatim.
		it("redacts a parsed query object on a breadcrumb", () => {
			const scrubbed = initOptions().beforeBreadcrumb({
				category: "http",
				data: {
					url: "/api/auth/callback/google",
					query: {
						state: "live-csrf-state",
						code: "live-auth-code",
						access_token: "live-access-token",
						refresh_token: "live-refresh-token",
						id_token: "live-id-token",
						token: "live-token",
						redirect_uri: "https://app.example.com/callback",
					},
				},
			})

			expect((scrubbed as { data: Record<string, any> }).data.query).toEqual({
				state: "[REDACTED]",
				code: "[REDACTED]",
				access_token: "[REDACTED]",
				refresh_token: "[REDACTED]",
				id_token: "[REDACTED]",
				// `token` is on the structured deny-list too, so it is removed
				// outright rather than masked — same as the pino path.
				redirect_uri: "https://app.example.com/callback",
			})

			const serialized = JSON.stringify(scrubbed)
			for (const secret of [
				"live-csrf-state",
				"live-auth-code",
				"live-access-token",
				"live-refresh-token",
				"live-id-token",
				"live-token",
			]) {
				expect(serialized).not.toContain(secret)
			}
		})

		it.each(["query_string", "params", "http.query"])(
			"redacts a parsed query object carried as `%s`",
			key => {
				const scrubbed = initOptions().beforeBreadcrumb({
					category: "http",
					data: { [key]: { state: "live-csrf-state", foo: "bar" } },
				})

				expect((scrubbed as { data: Record<string, any> }).data[key]).toEqual({
					state: "[REDACTED]",
					foo: "bar",
				})
			}
		)

		it("still redacts a breadcrumb query carried as a string or pair array", () => {
			const options = initOptions()

			const asString = options.beforeBreadcrumb({
				category: "http",
				data: { query: "state=live-csrf-state&foo=bar" },
			})
			expect((asString as { data: Record<string, any> }).data.query).toBe(
				"state=[REDACTED]&foo=bar"
			)

			const asPairs = options.beforeBreadcrumb({
				category: "http",
				data: {
					query: [
						["code", "live-auth-code"],
						["foo", "bar"],
					],
				},
			})
			expect((asPairs as { data: Record<string, any> }).data.query).toEqual([
				["code", "[REDACTED]"],
				["foo", "bar"],
			])
		})
	})

	describe("trace sampling", () => {
		function sampler(): InitOptions["tracesSampler"] {
			loadInstrument({
				SENTRY_ENABLED: "true",
				SENTRY_DSN: VALID_DSN,
				SENTRY_TRACES_SAMPLE_RATE: "0.5",
			})
			return (mockInit.mock.calls[0]?.[0] as InitOptions).tracesSampler
		}

		type SpanCase = [string, { name: string; attributes?: Record<string, unknown> }]

		// Load balancers poll /health continuously; sampled in, it would be most of
		// the trace quota and none of the signal.
		const healthCases: SpanCase[] = [
			["span name", { name: "GET /api/v1/health" }],
			["http.route attribute", { name: "GET", attributes: { "http.route": "/api/v1/health" } }],
			["url.path attribute", { name: "GET", attributes: { "url.path": "/api/v1/health" } }],
		]

		it.each(healthCases)("drops the health check by %s", (_label, context) => {
			expect(sampler()({ ...context, inheritOrSampleWith: fallback => fallback })).toBe(0)
		})

		it("samples everything else at the configured rate", () => {
			expect(
				sampler()({ name: "GET /api/v1/tickets", inheritOrSampleWith: fallback => fallback })
			).toBe(0.5)
		})
	})

	it("clamps an out-of-range or unparseable sample rate", () => {
		for (const [raw, expected] of [
			["5", 1],
			["-1", 0],
			["nonsense", 0],
		] as const) {
			mockInit.mockClear()
			loadInstrument({
				SENTRY_ENABLED: "true",
				SENTRY_DSN: VALID_DSN,
				SENTRY_TRACES_SAMPLE_RATE: raw,
			})
			expect(mockInit.mock.calls[0]?.[0]).toMatchObject({ tracesSampleRate: expected })
		}
	})
})
