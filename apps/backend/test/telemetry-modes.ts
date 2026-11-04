/**
 * The four OpenTelemetry / Sentry modes, checked against real processes.
 *
 * Run after a build: `pnpm -F @repo/backend verify:telemetry`.
 *
 * Not a jest e2e spec on purpose: OpenTelemetry patches http, express and pg
 * through Node's own module loader, which jest replaces, and CI's e2e job does
 * not build `dist/`. So this boots `node dist/main.js` once per mode, points it
 * at a local OTLP/HTTP receiver, sends one request carrying credential-shaped
 * values, shuts it down (which flushes), and checks what arrived. Exits 1 on
 * any failure. Needs the same local database the e2e suite uses.
 */
import { spawn, type ChildProcess } from "node:child_process"
import { once } from "node:events"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { join } from "node:path"

type Attribute = { key: string; value: Record<string, unknown> }
type Span = {
	/** Name of the instrumentation that produced the span (added by the receiver). */
	scope?: string
	name: string
	kind: number
	spanId: string
	parentSpanId?: string
	attributes?: Attribute[]
}
type Metric = { name: string; histogram?: { dataPoints: { count?: string | number }[] } }

const SPAN_KIND_SERVER = 2
const SECRETS = ["secret-bearer-x", "cookie-secret-y", "rid-secret-z", "tok-abc"]
const BACKEND_DIR = join(__dirname, "..")
const SENTRY_DUMMY_DSN = "https://public@127.0.0.1:9/1"

// ---------------------------------------------------------------- receiver

async function startReceiver() {
	const spans: Span[] = []
	const metrics: Metric[] = []
	const server: Server = createServer((request, response) => {
		const chunks: Buffer[] = []
		request.on("data", chunk => chunks.push(chunk as Buffer))
		request.on("end", () => {
			try {
				const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>
				if (request.url === "/v1/traces") {
					for (const resource of (body.resourceSpans as { scopeSpans: { spans: Span[] }[] }[]) ??
						[])
						for (const scope of resource.scopeSpans ?? [])
							spans.push(
								...(scope.spans ?? []).map(span => ({
									...span,
									scope: (scope as { scope?: { name?: string } }).scope?.name,
								}))
							)
				}
				if (request.url === "/v1/metrics") {
					for (const resource of (body.resourceMetrics as {
						scopeMetrics: { metrics: Metric[] }[]
					}[]) ?? [])
						for (const scope of resource.scopeMetrics ?? []) metrics.push(...(scope.metrics ?? []))
				}
			} catch {
				// Not JSON: ignored; the checks below report what is missing.
			}
			response.writeHead(200, { "content-type": "application/json" }).end("{}")
		})
	})
	server.listen(0, "127.0.0.1")
	await once(server, "listening")
	const { port } = server.address() as AddressInfo
	return {
		url: `http://127.0.0.1:${port}`,
		port,
		reset: () => {
			spans.length = 0
			metrics.length = 0
		},
		spans: () => [...spans],
		metrics: () => [...metrics],
		close: () => new Promise<void>(resolve => server.close(() => resolve())),
	}
}

// ---------------------------------------------------------------- backend

async function boot(env: Record<string, string>, port: number) {
	const child: ChildProcess = spawn(process.execPath, ["dist/main.js"], {
		cwd: BACKEND_DIR,
		env: { ...process.env, PORT: String(port), ...env },
		stdio: ["ignore", "pipe", "pipe"],
	})
	let output = ""
	child.stdout?.on("data", chunk => (output += String(chunk)))
	child.stderr?.on("data", chunk => (output += String(chunk)))

	const deadline = Date.now() + 30_000
	while (!output.includes("successfully started")) {
		if (child.exitCode !== null || Date.now() > deadline) {
			throw new Error(`backend did not start:\n${output.slice(-2000)}`)
		}
		await new Promise(resolve => setTimeout(resolve, 200))
	}
	return { child, output: () => output }
}

async function stop(child: ChildProcess) {
	if (child.exitCode !== null) return
	child.kill("SIGTERM")
	await Promise.race([once(child, "exit"), new Promise(resolve => setTimeout(resolve, 15_000))])
}

async function exercise(port: number) {
	const base = `http://127.0.0.1:${port}/api/v1`
	const started = Date.now()
	const todos = await fetch(`${base}/example/todos?token=tok-abc`, {
		headers: {
			"authorization": "Bearer secret-bearer-x",
			"cookie": "sess=cookie-secret-y",
			"x-request-id": "rid-secret-z",
		},
	})
	const todosMs = Date.now() - started
	await fetch(`${base}/health`)
	return { todosStatus: todos.status, todosMs }
}

// ---------------------------------------------------------------- checks

const attr = (span: Span, key: string) => {
	const value = span.attributes?.find(a => a.key === key)?.value
	return value ? Object.values(value)[0] : undefined
}

function traceChecks(spans: Span[], metrics: Metric[], receiverPort: number): string[] {
	const failures: string[] = []
	const isTodos = (span: Span) =>
		[attr(span, "http.route"), attr(span, "url.path"), attr(span, "http.target"), span.name].some(
			value => typeof value === "string" && value.includes("/example/todos")
		)

	const servers = spans.filter(span => span.kind === SPAN_KIND_SERVER && isTodos(span))
	if (servers.length !== 1) failures.push(`expected 1 server span for todos, got ${servers.length}`)

	const pg = spans.filter(
		span =>
			attr(span, "db.system") === "postgresql" || attr(span, "db.system.name") === "postgresql"
	)
	if (pg.length === 0) failures.push("no pg span")
	const pgKeys = pg.map(
		span =>
			`${span.parentSpanId}|${String(attr(span, "db.statement") ?? attr(span, "db.query.text") ?? span.name)}`
	)
	if (new Set(pgKeys).size !== pgKeys.length) failures.push("duplicated pg span (patched twice?)")

	// Double patching shows up two ways: one library producing spans from two
	// instrumentations, or a span nested directly in an identical span.
	const library = (span: Span) =>
		attr(span, "db.system") === "postgresql" || attr(span, "db.system.name") === "postgresql"
			? "pg"
			: attr(span, "express.type") !== undefined || /express/i.test(span.scope ?? "")
				? "express"
				: /nest/i.test(span.scope ?? "") || attr(span, "nestjs.type") !== undefined
					? "nest"
					: span.kind === SPAN_KIND_SERVER
						? "http-server"
						: undefined
	const scopesByLibrary = new Map<string, Set<string>>()
	for (const span of spans) {
		const name = library(span)
		if (!name) continue
		const scopes = scopesByLibrary.get(name) ?? new Set<string>()
		scopes.add(span.scope ?? "?")
		scopesByLibrary.set(name, scopes)
	}
	for (const [name, scopes] of scopesByLibrary)
		if (scopes.size > 1) failures.push(`${name} instrumented twice: ${[...scopes].join(", ")}`)
	const byId = new Map(spans.map(span => [span.spanId, span]))
	for (const span of spans) {
		const parent = span.parentSpanId ? byId.get(span.parentSpanId) : undefined
		if (
			parent &&
			parent.name === span.name &&
			parent.kind === span.kind &&
			parent.scope !== span.scope
		)
			failures.push(`"${span.name}" nested in an identical span from another instrumentation`)
	}

	if (
		spans.some(span =>
			[attr(span, "url.path"), attr(span, "http.target"), span.name].some(
				v => typeof v === "string" && v.includes("/health")
			)
		)
	)
		failures.push("the health check was traced")

	if (spans.some(span => JSON.stringify(span.attributes ?? []).includes(`:${receiverPort}`)))
		failures.push("the exporter's own OTLP request was traced (feedback loop)")

	const serialized = JSON.stringify(spans)
	for (const secret of SECRETS)
		if (serialized.includes(secret)) failures.push(`exported spans contain ${secret}`)

	// instrumentation-http 0.220 names it http.server.duration unless
	// OTEL_SEMCONV_STABILITY_OPT_IN=http selects http.server.request.duration.
	const duration = metrics.find(
		metric =>
			metric.name === "http.server.request.duration" || metric.name === "http.server.duration"
	)
	const count =
		duration?.histogram?.dataPoints.reduce((sum, point) => sum + Number(point.count ?? 0), 0) ?? 0
	if (count < 1) failures.push("no HTTP server duration data point")

	return failures
}

// ---------------------------------------------------------------- modes

async function main() {
	const receiver = await startReceiver()
	const closed = await startReceiver()
	const closedUrl = closed.url
	await closed.close()

	const otel = { OTEL_ENABLED: "true", OTEL_EXPORTER_OTLP_ENDPOINT: receiver.url }
	const sentry = {
		SENTRY_ENABLED: "true",
		SENTRY_DSN: SENTRY_DUMMY_DSN,
		SENTRY_TRACES_SAMPLE_RATE: "1",
	}
	const off = { OTEL_ENABLED: "false", SENTRY_ENABLED: "false" }

	const modes: { name: string; env: Record<string, string>; check: (run: Run) => string[] }[] = [
		{
			name: "off / off",
			env: off,
			check: run => [
				...(run.spans.length || run.metrics.length ? ["the receiver got data"] : []),
				...(/opentelemetry|\[otel\]/i.test(run.output) ? ["OpenTelemetry output in the log"] : []),
				...(/trace_id/.test(run.output) ? ["trace_id in the log with tracing off"] : []),
			],
		},
		{
			name: "OTel only",
			env: { ...off, ...otel },
			check: run => traceChecks(run.spans, run.metrics, receiver.port),
		},
		{
			name: "OTel and Sentry",
			env: { ...otel, ...sentry },
			check: run => traceChecks(run.spans, run.metrics, receiver.port),
		},
		{
			name: "Sentry only",
			env: { ...off, ...sentry },
			check: run => [
				...(run.spans.length || run.metrics.length ? ["the receiver got data"] : []),
				...(/trace_id/.test(run.output) ? [] : ["no trace_id in the log lines"]),
			],
		},
		{
			name: "OTel endpoint down",
			env: { ...off, OTEL_ENABLED: "true", OTEL_EXPORTER_OTLP_ENDPOINT: closedUrl },
			check: run => [
				...(run.todosStatus === 200 ? [] : [`todos answered ${run.todosStatus}`]),
				...(run.todosMs < 500 ? [] : [`todos took ${run.todosMs} ms`]),
				...(run.aliveAfterRequest ? [] : ["the process died"]),
			],
		},
	]

	let failed = false
	let port = 3310
	for (const mode of modes) {
		receiver.reset()
		const { child, output } = await boot(mode.env, ++port)
		const { todosStatus, todosMs } = await exercise(port)
		await new Promise(resolve => setTimeout(resolve, 1500))
		const aliveAfterRequest = child.exitCode === null
		await stop(child)
		const run: Run = {
			spans: receiver.spans(),
			metrics: receiver.metrics(),
			output: output(),
			todosStatus,
			todosMs,
			aliveAfterRequest,
		}
		const failures = mode.check(run)
		if (process.env.VERIFY_TELEMETRY_DEBUG) debugDump(run)
		failed ||= failures.length > 0
		console.log(
			`${failures.length ? "FAIL" : "PASS"}  ${mode.name}  (spans ${run.spans.length}, metrics ${run.metrics.length}, todos ${todosStatus} in ${todosMs} ms)`
		)
		for (const failure of failures) console.log(`      - ${failure}`)
	}

	await receiver.close()
	process.exit(failed ? 1 : 0)
}

/** `VERIFY_TELEMETRY_DEBUG=1`: what arrived, to explain a failure. Prints no secret values. */
function debugDump(run: Run) {
	const scopes = new Map<string, number>()
	for (const span of run.spans)
		scopes.set(span.scope ?? "?", (scopes.get(span.scope ?? "?") ?? 0) + 1)
	console.log("      scopes:", JSON.stringify([...scopes]))
	console.log(
		"      metrics:",
		JSON.stringify([...new Set(run.metrics.map(metric => metric.name))])
	)
	for (const span of run.spans) {
		const leaking = (span.attributes ?? []).filter(a =>
			SECRETS.some(secret => JSON.stringify(a.value).includes(secret))
		)
		if (leaking.length)
			console.log(`      leak in ${span.scope} "${span.name}":`, leaking.map(a => a.key).join(", "))
		const fields = Object.entries(span)
			.filter(([, value]) => SECRETS.some(secret => JSON.stringify(value)?.includes(secret)))
			.map(([key]) => key)
		if (!leaking.length && fields.length)
			console.log(
				`      leak outside attributes in ${span.scope} "${span.kind}": ${fields.join(", ")}`
			)
	}
	for (const span of run.spans.filter(
		s => s.name.includes("<anonymous>") || s.name.includes("{*path}")
	))
		console.log(
			`      ${span.scope} kind=${span.kind} parent=${span.parentSpanId?.slice(0, 6)} id=${span.spanId.slice(0, 6)} "${span.name}"`
		)
}

type Run = {
	spans: Span[]
	metrics: Metric[]
	output: string
	todosStatus: number
	todosMs: number
	aliveAfterRequest: boolean
}

void main()
