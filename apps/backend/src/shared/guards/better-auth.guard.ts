import {
	CanActivate,
	ExecutionContext,
	Inject,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { and, eq, gt } from "drizzle-orm"

import { auth } from "@repo/auth"
import { session as sessionTable } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"
import { IS_PUBLIC_KEY } from "@/shared/decorators/public.decorator"

import { BetterAuthService } from "@/modules/v1/auth/better-auth.service"

@Injectable()
export class BetterAuthGuard implements CanActivate {
	constructor(
		private readonly betterAuthService: BetterAuthService,
		private readonly reflector: Reflector,
		@Inject(DB) private readonly db: DBType
	) {
		console.error("🔧 BetterAuthGuard instantiated")
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Log immediately - before ANYTHING else, using multiple methods to ensure visibility
		// Write directly to stderr first (most reliable)
		process.stderr.write(`\n🛡️🛡️🛡️ BETTER AUTH GUARD - canActivate STARTED\n`)
		process.stderr.write(`Timestamp: ${new Date().toISOString()}\n`)
		process.stderr.write(`Context type: ${context.getType()}\n`)
		
		// Also use console methods
		console.error("🛡️🛡️🛡️ BETTER AUTH GUARD - canActivate STARTED")
		console.log("🛡️🛡️🛡️ BETTER AUTH GUARD - canActivate STARTED (console.log)")
		
		// Force flush
		if (process.stdout.isTTY) {
			process.stdout.write('')
		}
		if (process.stderr.isTTY) {
			process.stderr.write('')
		}
		
		let request: any = null
		try {
			try {
				request = context.switchToHttp().getRequest()
			} catch (httpError: any) {
				process.stderr.write(`\n❌ Failed to get HTTP request: ${httpError?.message}\n`)
				console.error("❌ Failed to get HTTP request:", httpError)
				throw new UnauthorizedException("Invalid request context")
			}
			
			// Log all guard activations for debugging - use console.error to ensure it shows up
			// Also use process.stderr.write to bypass any log filtering
			// Write to both stderr and console.error to ensure visibility
			const timestamp = new Date().toISOString()
			const logMsg = `\n🛡️ [${timestamp}] Better Auth Guard activated - ${request.method} ${request.url}\n`
			process.stderr.write(logMsg)
			process.stdout.write(logMsg) // Also write to stdout
			console.error("🛡️ Better Auth Guard activated", {
				method: request.method,
				url: request.url,
				path: request.path,
				timestamp,
			})
			
			const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
				context.getHandler(),
				context.getClass(),
			])

			if (isPublic) {
				process.stderr.write(`\n✅ Route is public, allowing access\n`)
				console.error("✅ Route is public, allowing access")
				return true
			}

			// Use Better Auth session only - no JWT fallback
			const authInstance = this.betterAuthService.getAuthInstance()
			// First, try to get session token from cookie or Authorization header
			const cookies = request.headers.cookie || ""
			const authHeader = request.headers.authorization || ""

			console.error("🔍 Better Auth Guard - Checking authentication", {
				endpoint: request.url,
				hasCookies: !!cookies,
				hasAuthHeader: !!authHeader,
				authHeaderPrefix: authHeader ? authHeader.substring(0, 30) : "none",
				allHeaders: Object.keys(request.headers),
			})

			// Extract session token from cookie (Better Auth uses specific cookie name)
			let sessionToken: string | null = null

			// Better Auth typically uses a cookie named something like 'better-auth.session_token'
			// Let's check for common Better Auth cookie patterns
			const cookieMatch =
				cookies.match(/better-auth\.session_token=([^;]+)/) ||
				cookies.match(/session_token=([^;]+)/) ||
				cookies.match(/better-auth\.token=([^;]+)/) ||
				cookies.match(/token=([^;]+)/)

			if (cookieMatch) {
				sessionToken = decodeURIComponent(cookieMatch[1])
				if (sessionToken) {
					console.error("✅ Session token found in cookie", { tokenLength: sessionToken.length, tokenPrefix: sessionToken.substring(0, 20) })
				}
			} else if (authHeader.startsWith("Bearer ")) {
				sessionToken = authHeader.substring(7).trim()
				if (sessionToken) {
					process.stderr.write(`\n✅ Session token found in Authorization header: ${sessionToken}\n`)
					console.error("✅ Session token found in Authorization header", { 
						tokenLength: sessionToken.length, 
						tokenPrefix: sessionToken.substring(0, 20),
						fullToken: sessionToken,
					})
				}
			} else {
				process.stderr.write(`\n⚠️ No session token found - cookies: ${!!cookies}, authHeader: ${authHeader.substring(0, 30)}\n`)
				console.error("⚠️ No session token found in cookies or Authorization header")
			}

			// If we have a session token, try to validate it by querying the session table
			if (sessionToken) {
				process.stderr.write(`\n🔍 Looking up session in database with token: ${sessionToken}\n`)
				console.error("🔍 Looking up session in database...", { 
					tokenLength: sessionToken.length,
					tokenPrefix: sessionToken.substring(0, 30),
					fullToken: sessionToken, // Log full token for debugging
					tokenType: typeof sessionToken,
					tokenCharCodes: sessionToken.split('').slice(0, 10).map(c => c.charCodeAt(0)),
				})
				
				// Better Auth session tokens might be stored differently
				// Try both the token field and the id field
				// First, try by token field
				const now = new Date()
				const [dbSession] = await this.db
					.select()
					.from(sessionTable)
					.where(
						and(
							eq(sessionTable.token, sessionToken),
							gt(sessionTable.expiresAt, now) // Session not expired
						)
					)
					.limit(1)

				console.error("🔍 Query result by token:", {
					found: !!dbSession,
					sessionId: dbSession?.id,
					sessionToken: dbSession?.token,
					sessionTokenLength: dbSession?.token?.length,
					userId: dbSession?.userId,
					searchingForToken: sessionToken,
					searchingForTokenLength: sessionToken.length,
					tokensMatch: dbSession?.token === sessionToken,
					tokenExactMatch: dbSession?.token === sessionToken ? "YES" : "NO",
					expiresAt: dbSession?.expiresAt,
					isExpired: dbSession?.expiresAt ? dbSession.expiresAt <= now : "unknown",
					currentTime: now.toISOString(),
				})

				// If not found by token, try by id
				let session = dbSession
				if (!session) {
					console.error("Session not found by token, trying by id...")
					const now = new Date()
					const [dbSessionById] = await this.db
						.select()
						.from(sessionTable)
						.where(
							and(
								eq(sessionTable.id, sessionToken),
								gt(sessionTable.expiresAt, now)
							)
						)
						.limit(1)
					
					console.error("🔍 Query result by id:", {
						found: !!dbSessionById,
						sessionId: dbSessionById?.id,
						sessionToken: dbSessionById?.token,
						sessionTokenLength: dbSessionById?.token?.length,
						userId: dbSessionById?.userId,
						searchingForToken: sessionToken,
						searchingForTokenLength: sessionToken.length,
						tokensMatch: dbSessionById?.token === sessionToken,
						idExactMatch: dbSessionById?.id === sessionToken ? "YES" : "NO",
						expiresAt: dbSessionById?.expiresAt,
						isExpired: dbSessionById?.expiresAt ? dbSessionById.expiresAt <= now : "unknown",
						currentTime: now.toISOString(),
					})
					
					session = dbSessionById
				}

				if (session) {
					console.error("✅ Session found in database", { 
						sessionId: session.id.substring(0, 20),
						userId: session.userId,
						expiresAt: session.expiresAt,
					})
					
					// Session is valid - get user info
					const userId = session.userId
					const user = await this.betterAuthService.getUserWithInfo(userId)

					if (!user) {
						console.error("❌ Session found but user not found", { userId, sessionId: session.id })
						throw new UnauthorizedException("User not found")
					}

					// Attach user to request
					request.user = user
					console.error("✅ Authentication successful", { userId, userRole: user.role })
					return true
				} else {
					// Session token provided but not found in database
					// This might mean Better Auth hasn't created the session yet
					// or the token format doesn't match
					console.error("⚠️ Session token provided but not found in database", {
						sessionTokenLength: sessionToken.length,
						sessionTokenPrefix: sessionToken.substring(0, 30),
						fullToken: sessionToken, // Log full token for debugging
						hasCookies: !!cookies,
						hasAuthHeader: !!authHeader,
					})
					
					// Let's check if there are any sessions in the database at all
					const allSessions = await this.db.select().from(sessionTable).limit(100)
					console.error("📊 All sessions in database:", allSessions.map(s => ({
						id: s.id,
						token: s.token,
						userId: s.userId,
						expiresAt: s.expiresAt,
					})))
					
					// Try case-insensitive match
					const caseInsensitiveMatch = allSessions.find(s => 
						s.token?.toLowerCase() === sessionToken.toLowerCase() ||
						s.id?.toLowerCase() === sessionToken.toLowerCase()
					)
					if (caseInsensitiveMatch) {
						console.error("⚠️ Found case-insensitive match - token format issue!")
						console.error("Case-insensitive match details:", {
							foundId: caseInsensitiveMatch.id,
							foundToken: caseInsensitiveMatch.token,
							searchingFor: sessionToken,
							idMatch: caseInsensitiveMatch.id?.toLowerCase() === sessionToken.toLowerCase(),
							tokenMatch: caseInsensitiveMatch.token?.toLowerCase() === sessionToken.toLowerCase(),
						})
						session = caseInsensitiveMatch
					}
					
					// Also check if any session has a matching token substring
					const matchingSessions = allSessions.filter(s => 
						s.token?.includes(sessionToken.substring(0, 10)) || 
						s.id?.includes(sessionToken.substring(0, 10))
					)
					if (matchingSessions.length > 0) {
						console.error("🔍 Found sessions with partial token match:", matchingSessions.map(s => ({
							id: s.id,
							token: s.token,
							userId: s.userId,
						})))
					}
					
					// If we found a case-insensitive match, use it
					if (session) {
						console.error("✅ Using case-insensitive match for session", { 
							sessionId: session.id.substring(0, 20),
							userId: session.userId,
							expiresAt: session.expiresAt,
						})
						
						// Session is valid - get user info
						const userId = session.userId
						const user = await this.betterAuthService.getUserWithInfo(userId)

						if (!user) {
							console.error("❌ Session found but user not found", { userId, sessionId: session.id })
							throw new UnauthorizedException("User not found")
						}

						// Attach user to request
						request.user = user
						console.error("✅ Authentication successful (case-insensitive match)", { userId, userRole: user.role })
						return true
					}
				}
			} else {
				console.error("⚠️ No session token found", {
					hasCookies: !!cookies,
					hasAuthHeader: !!authHeader,
					cookieKeys: cookies ? cookies.split(";").map((c: string) => c.split("=")[0]?.trim() || "").filter(Boolean) : [],
				})
			}

			// Fallback: Try Better Auth's getSession API (if cookies are available)
			// Better Auth needs a proper Fetch Request object to read cookies
			try {
				const url = `${request.protocol}://${request.get("host")}${request.originalUrl}`

				// Build headers with cookies
				const headers = new Headers()
				Object.keys(request.headers).forEach((key) => {
					const value = request.headers[key]
					if (value) {
						if (Array.isArray(value)) {
							value.forEach((v) => headers.append(key, v))
						} else {
							headers.set(key, value)
						}
					}
				})

				// Ensure cookies are in the headers
				if (cookies) {
					headers.set("cookie", cookies)
				}

				// Get Better Auth session using Fetch Request
				const fetchRequest = new Request(url, {
					method: request.method,
					headers: headers,
				})

				const sessionResult = await authInstance.api.getSession({
					headers: fetchRequest.headers as any,
				})

				if (sessionResult?.user) {
					// Get full user info from our User table
					const userId = sessionResult.user.id
					const user = await this.betterAuthService.getUserWithInfo(userId)

					if (!user) {
						throw new UnauthorizedException("User not found")
					}

					// Attach user to request
					request.user = user
					return true
				}
			} catch (betterAuthError: any) {
				// Log but don't throw - we'll throw a generic error below
				console.error("Better Auth getSession error:", betterAuthError?.message || betterAuthError)
			}

			// If we get here, authentication failed
			console.error("❌ Authentication failed - no valid session found", {
				url: request.url,
				method: request.method,
				hasCookies: !!cookies,
				hasAuthHeader: !!authHeader,
				hasSessionToken: !!sessionToken,
				sessionTokenPrefix: sessionToken ? sessionToken.substring(0, 20) : null,
				cookieKeys: cookies ? cookies.split(";").map((c: string) => c.split("=")[0]?.trim() || "").filter(Boolean).slice(0, 5) : [],
			})
			throw new UnauthorizedException("Invalid or missing session")
		} catch (error: any) {
			if (error instanceof UnauthorizedException) {
				process.stderr.write(`\n❌ Better Auth Guard - UnauthorizedException: ${error.message}\n`)
				console.error("❌ Better Auth Guard - UnauthorizedException", {
					message: error.message,
					url: request?.url,
					method: request?.method,
				})
				throw error
			}
			process.stderr.write(`\n❌ Better Auth guard error: ${error?.message || error}\n`)
			console.error("❌ Better Auth guard error:", {
				message: error?.message || error,
				stack: error?.stack,
				url: request?.url,
				method: request?.method,
			})
			throw new UnauthorizedException("Authentication failed")
		}
	}
}
