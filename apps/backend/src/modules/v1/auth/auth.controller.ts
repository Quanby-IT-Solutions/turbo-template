import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
} from "@nestjs/common"
import type { Request, Response } from "express"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { LoginDto, RegisterDto, UserResponseDto } from "@repo/contracts"

import { User } from "@/shared/decorators/user.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { AuditService } from "@/shared/services/audit.service"

import { AuthService } from "./auth.service"

@Controller({ path: "auth", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use guards on protected routes
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly auditService: AuditService
	) {}

	@Post("login")
	@HttpCode(HttpStatus.OK)
	@AllowAnonymous()
	async login(@Body() loginDto: LoginDto, @Req() req: Request, @Res() res: Response) {
		// Email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(loginDto.email)) {
			await this.auditService.logSecurityEvent(
				"INVALID_EMAIL_FORMAT",
				"WARNING",
				`Invalid email format provided for login: ${loginDto.email}`,
				null,
				req.ip || "unknown",
				req.get("user-agent") || "unknown",
				{ email: loginDto.email }
			)
			throw new Error("Invalid email format")
		}

		try {
			const authResponse = await this.authService.login(loginDto)

			await this.auditService.logAuthEvent(
				"LOGIN",
				authResponse.user.id,
				loginDto.email,
				req.ip || "unknown",
				req.get("user-agent") || "unknown",
				{
					userRole: authResponse.user.role,
					organizationId: authResponse.user.organizationId,
				}
			)

			// Set session cookie for Better Auth
			if (authResponse.sessionToken) {
				res.cookie("better-auth.session_token", authResponse.sessionToken, {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: "lax",
					maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
					path: "/",
				})
				// Also set a simpler cookie name for compatibility
				res.cookie("session_token", authResponse.sessionToken, {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: "lax",
					maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
					path: "/",
				})
			}

			return res.json({
				success: true,
				message: "Login successful",
				data: authResponse,
			})
		} catch (error) {
			await this.auditService.logAuthEvent(
				"LOGIN_FAILED",
				null,
				loginDto.email,
				req.ip || "unknown",
				req.get("user-agent") || "unknown",
				{
					error: error instanceof Error ? error.message : "Unknown error",
				}
			)

			throw error
		}
	}

	@Post("register")
	@HttpCode(HttpStatus.CREATED)
	@AllowAnonymous()
	async register(@Body() registerDto: RegisterDto) {
		// Validation
		if (!registerDto.email || !registerDto.password || !registerDto.role) {
			throw new Error("Email, password, and role are required")
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(registerDto.email)) {
			throw new Error("Invalid email format")
		}

		if (!this.authService.validatePasswordStrength(registerDto.password)) {
			throw new Error(
				"Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
			)
		}

		try {
			const authResponse = await this.authService.register(registerDto)

			await this.auditService.logAuthEvent(
				"REGISTER",
				authResponse.user.id,
				registerDto.email,
				"unknown",
				"unknown",
				{
					userRole: registerDto.role,
				}
			)

			return {
				success: true,
				message: "Registration successful",
				data: authResponse,
			}
		} catch (error) {
			throw error
		}
	}

	@Post("refresh")
	@HttpCode(HttpStatus.OK)
	@AllowAnonymous()
	async refreshToken(
		@Body("sessionToken") sessionToken?: string,
		@Body("refreshToken") refreshToken?: string
	) {
		// Better Auth handles session refresh automatically via cookies
		// This endpoint is for backward compatibility
		const token = sessionToken || refreshToken
		if (!token) {
			throw new Error("Session token is required")
		}

		const result = await this.authService.refreshToken(token)
		return {
			success: true,
			message: "Session refreshed successfully",
			data: result,
		}
	}

	@Get("check-email/:email")
	@AllowAnonymous()
	async checkEmail(@Param("email") email: string) {
		const exists = await this.authService.emailExists(email)
		return {
			success: true,
			data: { exists },
		}
	}

	@Post("validate-password")
	@HttpCode(HttpStatus.OK)
	@AllowAnonymous()
	async validatePassword(@Body("password") password: string) {
		if (!password) {
			throw new Error("Password is required")
		}

		const isValid = this.authService.validatePasswordStrength(password)
		return {
			success: true,
			data: { isValid },
		}
	}

	@Get("profile")
	@ZodSerializerDto(UserResponseDto)
	@UseGuards(BetterAuthGuard)
	async getProfile(@User() user: any) {
		if (!user) {
			throw new UnauthorizedException("User not authenticated")
		}
		const userId = user?.userId || user?.id
		if (!userId) {
			throw new UnauthorizedException("User ID not found")
		}
		const profile = await this.authService.getUserProfile(userId)
		return {
			success: true,
			data: profile,
		}
	}

	@Post("logout")
	@HttpCode(HttpStatus.OK)
	@AllowAnonymous()
	async logout(@User() user: any, @Body("refreshToken") refreshToken?: string) {
		// User might be null if not authenticated, handle gracefully
		const userId = user?.userId || user?.id
		if (userId) {
			await this.authService.logout(userId, refreshToken)
		}
		return {
			success: true,
			message: "Logout successful",
		}
	}
}
