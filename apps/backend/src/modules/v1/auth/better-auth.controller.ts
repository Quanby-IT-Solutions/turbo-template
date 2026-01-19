import { All, Controller, Req, Res } from "@nestjs/common"
import type { Request, Response } from "express"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"

import { BetterAuthService } from "./better-auth.service"

/**
 * Controller to handle Better Auth API routes
 * This proxies requests to Better Auth's handler
 */
@Controller({ path: "better-auth", version: "1" })
@AllowAnonymous() // Better Auth routes should be public
export class BetterAuthController {
	constructor(private readonly betterAuthService: BetterAuthService) {}

	@All("*")
	async handleAuth(@Req() req: Request, @Res() res: Response) {
		try {
			const auth = this.betterAuthService.getAuthInstance()

			// Better Auth handler works with Fetch API Request
			// We need to convert Express req to Fetch Request
			const url = `${req.protocol}://${req.get("host")}${req.originalUrl.replace("/api/v1/better-auth", "/api/auth")}`

			// Get body for non-GET requests
			let body: string | undefined
			if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
				body = typeof req.body === "string" ? req.body : JSON.stringify(req.body)
			}

			// Create Fetch Request
			const fetchRequest = new Request(url, {
				method: req.method,
				headers: new Headers(req.headers as any),
				body,
			})

			// Call Better Auth handler
			const response = await auth.handler(fetchRequest)

			if (!response) {
				return res.status(404).json({ error: "Route not found" })
			}

			// Convert Fetch Response to Express response
			res.status(response.status)

			// Copy headers
			response.headers.forEach((value: string, key: string) => {
				res.setHeader(key, value)
			})

			// Handle response body based on content type
			const contentType = response.headers.get("content-type") || ""

			if (contentType.includes("application/json")) {
				const data = await response.json()
				return res.json(data)
			} else if (contentType.includes("text/")) {
				const text = await response.text()
				return res.send(text)
			} else {
				// For other types, get as array buffer
				const arrayBuffer = await response.arrayBuffer()
				const buffer = Buffer.from(arrayBuffer)
				return res.send(buffer)
			}
		} catch (error: any) {
			console.error("Better Auth handler error:", error)
			return res.status(error.status || 500).json({
				error: error.message || "Internal server error",
			})
		}
	}
}
