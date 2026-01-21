import { NestFactory } from "@nestjs/core"
import { ExpressAdapter } from "@nestjs/platform-express"
import type { VercelRequest, VercelResponse } from "@vercel/node"
import express from "express"

import { MainModule } from "../apps/backend/dist/main.module"

// Cache the NestJS app instance across function invocations
let cachedApp: express.Application | null = null

async function bootstrapNest() {
	if (cachedApp) {
		return cachedApp
	}

	const expressApp = express()
	const adapter = new ExpressAdapter(expressApp)

	const app = await NestFactory.create(MainModule, adapter, {
		bodyParser: false, // Better Auth requires access to raw request body
	})

	// Re-add body parser for JSON and URL encoded
	app.use(express.json())
	app.use(express.urlencoded({ extended: true }))

	// CORS configuration
	const corsOrigins = process.env.ALLOWED_ORIGINS?.split(",") || true

	app.enableCors({
		origin: corsOrigins,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
		exposedHeaders: ["X-Total-Count", "X-Page-Count"],
		maxAge: 86400,
	})

	app.setGlobalPrefix("api")

	await app.init()
	cachedApp = expressApp

	return expressApp
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const app = await bootstrapNest()
	return app(req as any, res as any)
}
