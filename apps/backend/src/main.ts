import "reflect-metadata"

import { VersioningType } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger"
import { apiReference } from "@scalar/nestjs-api-reference"
import compression from "compression"
import * as express from "express"
import helmet from "helmet"
import { cleanupOpenApiDoc } from "nestjs-zod"

import { MainModule } from "@/main.module"

async function bootstrap() {
	const app = await NestFactory.create(MainModule, {
		bodyParser: false, // Better Auth requires access to raw request body
	})

	// Re-add body parser for JSON and URL encoded
	// Better Auth will handle its own routes
	app.use(express.json())
	app.use(express.urlencoded({ extended: true }))

	// Add request logging middleware to debug authentication issues
	// This MUST be before any other middleware to catch all requests
	app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
		// Log ALL API requests (not just v1) to see what's happening
		if (req.path.startsWith("/api/")) {
			const authHeader = req.headers.authorization || ""
			const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null
			process.stderr.write(`\n📥 [${new Date().toISOString()}] ${req.method} ${req.path}\n`)
			process.stderr.write(
				`   Auth: ${token ? `${token.substring(0, 32)} (len: ${token.length})` : "none"}\n`
			)
			process.stderr.write(
				`   Cookies: ${req.headers.cookie ? `yes (${req.headers.cookie.length} chars)` : "no"}\n`
			)
		}
		next()
	})

	// Security middleware
	const corsOrigins =
		process.env.NODE_ENV === "production"
			? process.env.ALLOWED_ORIGINS?.split(",") || [
					"https://qhealth-web.vercel.app",
					"https://quanby-healthcare-v2.vercel.app",
					"https://qhealthcare.quanbyit.com",
					"http://localhost:4200",
					"http://127.0.0.1:4200",
				]
			: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
					// DEV ONLY: allow all origins, including LAN IPs like http://192.168.x.x:3001
					callback(null, true)
				}

	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"],
					scriptSrc: ["'self'"],
					imgSrc: ["'self'", "data:", "https:"],
					connectSrc: ["'self'"],
					fontSrc: ["'self'"],
					objectSrc: ["'none'"],
					mediaSrc: ["'self'"],
					frameSrc: ["'none'"],
				},
			},
			hsts: {
				maxAge: 31536000,
				includeSubDomains: true,
				preload: true,
			},
		})
	)
	app.use(compression())

	// CORS configuration
	app.enableCors({
		origin: corsOrigins,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
		exposedHeaders: ["X-Total-Count", "X-Page-Count"],
		maxAge: 86400,
	})

	// Set the global prefix for the API
	app.setGlobalPrefix("api")
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: "1",
	})

	// Create the OpenAPI document
	const openApiDoc = SwaggerModule.createDocument(
		app,
		new DocumentBuilder()
			.setTitle("API Documentation")
			.setDescription("Type-safe API with auto-generated documentation")
			.setVersion("1.0")
			.build()
	) as OpenAPIObject

	// Setup the Swagger module
	SwaggerModule.setup("api", app, cleanupOpenApiDoc(openApiDoc) as OpenAPIObject)

	// Setup the Scalar API Reference
	app.use(
		"/api/docs",
		apiReference({
			content: openApiDoc,
			theme: "none",
		})
	)

	const port = process.env.PORT ?? 3000
	await app.listen(port)
	console.log(`🚀 Server running on port ${port}`)
}

bootstrap().catch(error => {
	console.error(error)
	process.exit(1)
})
