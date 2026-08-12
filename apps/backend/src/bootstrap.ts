import { VersioningType, type INestApplication } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import type { Application } from "express"
import helmet from "helmet"
import { Logger } from "nestjs-pino"
import pinoHttp from "pino-http"

import { AppModule } from "@/app.module"
import { configureApp, configureCors } from "@/config/app.config"
import { setupBetterAuth } from "@/config/auth.config"
import { env, isApiDocsEnabled } from "@/config/env.config"
import { buildPinoHttpOptions } from "@/config/pino-logger.config"
import { buildHelmetOptions } from "@/config/security-headers.config"
import { setupSwagger } from "@/config/swagger.config"

/**
 * Configure URI-based API versioning (e.g., /api/v1/*, /api/v2/*)
 */
function setupVersioning(app: INestApplication, logger: Logger): void {
	app.setGlobalPrefix("api")
	app.enableVersioning({ type: VersioningType.URI })
	logger.log("URI-based API versioning enabled")
}

/**
 * Create and configure the NestJS application
 */
async function createApplication(): Promise<INestApplication> {
	// bufferLogs defers early logs until the pino logger is installed below.
	const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true })

	// Swap Nest's default logger for the pino-backed one from LoggerModule.
	const logger = app.get(Logger)
	app.useLogger(logger)

	logger.log("Creating NestJS application...")

	// Trust the reverse proxy so Express populates req.ips from X-Forwarded-For.
	// Must run before any middleware/guard that reads the client IP (the throttler).
	const httpAdapter = app.getHttpAdapter()
	const expressApp = httpAdapter.getInstance() as Application
	expressApp.set("trust proxy", env.TRUST_PROXY)

	// ED-1: security headers first, so they cover EVERY response — including
	// the auth routes Better Auth short-circuits before Nest sees them, and
	// error responses produced by later middleware.
	expressApp.use(helmet(buildHelmetOptions()))

	// IMPORTANT: CORS must be registered BEFORE the Better Auth middleware.
	// The auth middleware short-circuits /api/v1/auth/* requests, so if CORS
	// runs after it, auth responses (and OPTIONS preflight) get no CORS headers
	// and the browser blocks them.
	configureCors(app)

	// IMPORTANT: pino-http must be registered BEFORE the Better Auth middleware.
	// Better Auth short-circuits /api/v1/auth/* before they reach Nest, so this
	// raw-Express middleware is what assigns req.id + X-Request-Id and logs
	// request/response for auth routes too. autoLogging stays on here
	// (authoritative). The Nest-side LoggerModule middleware runs later with
	// autoLogging off and reuses this req.id (see buildPinoHttpOptions.genReqId),
	// so there is exactly one request log line and one correlation id per request.
	expressApp.use(pinoHttp(buildPinoHttpOptions()))

	// IMPORTANT: Better Auth must be registered BEFORE express.json() body parser.
	// Better Auth's toNodeHandler reads the raw request stream for body parsing.
	// If express.json() runs first, it consumes the stream and Better Auth sees
	// an empty body → sign-in/sign-up return null.
	const apiDocsEnabled = isApiDocsEnabled(env.NODE_ENV, env.ENABLE_API_DOCS)

	setupBetterAuth(app, apiDocsEnabled)
	configureApp(app)
	setupVersioning(app, logger)

	if (apiDocsEnabled) {
		await setupSwagger(app)
		logger.log("API docs enabled (Scalar UI + spec.json)")
	} else {
		logger.log("API docs disabled (ENABLE_API_DOCS=false or production default)")
	}

	return app
}

/**
 * Start the application listener
 */
async function startApplication(app: INestApplication): Promise<void> {
	const logger = app.get(Logger)
	const port = env.PORT
	await app.listen(port)

	logger.log(`Application is running on: http://localhost:${port}`)
	logger.log(`Environment: ${env.NODE_ENV}`)
}

/**
 * Bootstrap the application
 */
export async function bootstrap(): Promise<void> {
	try {
		const app = await createApplication()
		await startApplication(app)
	} catch (error) {
		// Logging infrastructure may itself be the failure here, so fall back to console.
		console.error("Failed to bootstrap application", error)
		process.exit(1)
	}
}
