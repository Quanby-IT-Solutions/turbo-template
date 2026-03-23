import { Logger, VersioningType, type INestApplication } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"

import { AppModule } from "@/app.module"
import { configureApp } from "@/config/app.config"
import { setupBetterAuth } from "@/config/auth.config"
import { env } from "@/config/env.config"
import { setupSwagger } from "@/config/swagger.config"

const logger = new Logger("Bootstrap")

/**
 * Configure URI-based API versioning (e.g., /api/v1/*, /api/v2/*)
 */
function setupVersioning(app: INestApplication): void {
	app.setGlobalPrefix("api")
	app.enableVersioning({ type: VersioningType.URI })
	logger.log("URI-based API versioning enabled")
}

/**
 * Create and configure the NestJS application
 */
async function createApplication(): Promise<INestApplication> {
	logger.log("Creating NestJS application...")
	const app = await NestFactory.create(AppModule, { bodyParser: false })

	configureApp(app)
	setupVersioning(app)
	setupBetterAuth(app)
	await setupSwagger(app)

	return app
}

/**
 * Start the application listener
 */
async function startApplication(app: INestApplication): Promise<void> {
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
		logger.error("Failed to bootstrap application", error)
		process.exit(1)
	}
}
