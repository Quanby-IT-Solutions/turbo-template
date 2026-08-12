import { createEnv } from "@t3-oss/env-core"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError } from "better-auth/api"
import { openAPI } from "better-auth/plugins"
import { z } from "zod"

import { createDBClient } from "@repo/db/client"
import { accounts, sessions, users, verifications } from "@repo/db/schema"

import { cookieDomainSchema } from "./cookie-domain-schema.js"
import { booleanFromEnv } from "./mailer/bool-schema.js"
import { sendMail } from "./mailer/send-mail.js"
import { buildResetPasswordEmail } from "./mailer/templates/reset-password-email.js"
import { buildVerificationEmail } from "./mailer/templates/verification-email.js"
import { createTransport } from "./mailer/transport-factory.js"
import { authSecretSchema } from "./secret-schema.js"

/**
 * Type-safe environment variable validation for Auth package
 *
 * Validates auth-related environment variables at module load time.
 * This ensures all required auth configuration is present before initialization.
 */
export const authEnv = createEnv({
	server: {
		// Authentication.
		// Shared with the backend's own env config via `authSecretSchema` so both
		// processes reject the same weak/placeholder secrets (RF3, F-03).
		BETTER_AUTH_SECRET: authSecretSchema,
		BETTER_AUTH_TRUSTED_ORIGINS: z.string(),
		// AC-3 / F-33: any non-empty value used to enable cross-subdomain cookies,
		// so a typo silently widened the session cookie's scope. Unset by default,
		// which means a host-only cookie — the narrowest option.
		BETTER_AUTH_COOKIE_DOMAIN: cookieDomainSchema,

		// OAuth Providers (Google)
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),

		// SMTP / Mailer
		SMTP_HOST: z.string().optional(),
		SMTP_PORT: z.coerce.number().int().positive().optional(),
		SMTP_USER: z.string().optional(),
		SMTP_PASS: z.string().optional(),
		SMTP_SECURE: booleanFromEnv.optional().default(false),
		MAIL_FROM: z.string().optional().default('"Dev Mailer" <no-reply@localhost>'),
		APP_WEB_URL: z.string().url().optional().default("http://localhost:3001"),

		// Email verification behaviour
		EMAIL_VERIFICATION_ENABLED: booleanFromEnv.optional().default(true),
		// AC-3: the PRD records this business decision as "verification required".
		// Defaulting it off meant an unverified address could sign in, which is
		// the opposite of what was agreed.
		EMAIL_VERIFICATION_REQUIRED: booleanFromEnv.optional().default(true),

		// Auth rate limiting
		AUTH_RATE_LIMIT_WINDOW: z.coerce.number().int().positive().optional().default(60),
		AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional().default(10),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
})

/**
 * Internal basePath used by Better Auth.
 * All versioned API requests (/api/v1/auth/*, /api/v2/auth/*, etc.) are
 * normalized to this path before being handled by Better Auth.
 */
export const AUTH_BASE_PATH = "/auth"

/**
 * Creates a Better Auth instance configured with Drizzle adapter.
 *
 * The auth instance uses database connection from @repo/db and is
 * configured to work across multiple apps (backend, web, mobile via API).
 *
 * Uses a neutral basePath ("/auth") - the backend normalizes versioned
 * paths (/api/v1/auth/*, /api/v2/auth/*) to this basePath before handling.
 *
 * @returns Better Auth instance
 */
export function createAuth(): ReturnType<typeof betterAuth> {
	const db = createDBClient()

	// LG-1 / RF3: throws in production when SMTP_HOST is unset, rather than
	// falling back to a transport that prints reset links and delivers nothing.
	const transporter = createTransport({
		smtpHost: authEnv.SMTP_HOST,
		smtpPort: authEnv.SMTP_PORT,
		smtpUser: authEnv.SMTP_USER,
		smtpPass: authEnv.SMTP_PASS,
		smtpSecure: authEnv.SMTP_SECURE,
		nodeEnv: process.env.NODE_ENV,
	})
	const mailFrom = authEnv.MAIL_FROM
	const appWebUrl = authEnv.APP_WEB_URL
	const verificationRequired = authEnv.EMAIL_VERIFICATION_REQUIRED
	// AC-3: requiring verification while sending is disabled produces accounts
	// that can never sign in — no mail is sent, so the gate never opens. The two
	// flags are made coherent here rather than left to trip an operator: if
	// verification is required, sending is on.
	const verificationEnabled = authEnv.EMAIL_VERIFICATION_ENABLED || verificationRequired

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: {
				users,
				sessions,
				accounts,
				verifications,
			},
			usePlural: true,
		}),
		basePath: AUTH_BASE_PATH,
		secret: authEnv.BETTER_AUTH_SECRET,
		rateLimit: {
			enabled: true,
			window: authEnv.AUTH_RATE_LIMIT_WINDOW,
			max: authEnv.AUTH_RATE_LIMIT_MAX,
		},
		emailVerification: {
			sendOnSignUp: verificationEnabled,
			sendVerificationEmail: async ({ user, token }) => {
				// Honor disabled-sending config for both automatic signup sends
				// and explicit resend-verification actions.
				if (!verificationEnabled) {
					return
				}

				const verificationUrl = `${appWebUrl}/verify-email?token=${token}`
				const email = buildVerificationEmail({
					verificationUrl,
					userEmail: user.email,
				})
				const message = {
					to: user.email,
					subject: email.subject,
					html: email.html,
					text: email.text,
				}

				if (verificationRequired) {
					try {
						await sendMail(transporter, mailFrom, message)
					} catch (err) {
						// Log the raw transport failure server-side, but surface a
						// sanitized error to clients so SMTP internals never leak.
						console.error("[mailer] verification email failed:", err)
						throw new APIError("INTERNAL_SERVER_ERROR", {
							message: "Verification email is currently unavailable. Please try again later.",
						})
					}
				} else {
					try {
						await sendMail(transporter, mailFrom, message)
					} catch (err) {
						console.error("[mailer] verification email failed:", err)
					}
				}
			},
		},
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: verificationRequired,
			/**
			 * Send a password-reset link (AC-4 / F-18).
			 *
			 * Failures are swallowed on purpose. Better Auth already returns the
			 * same generic response whether or not the account exists; letting a
			 * transport error escape from here would break that, because a
			 * mailable address would 200 while an SMTP failure 500'd — turning
			 * the endpoint into an account-enumeration oracle for anyone who can
			 * make delivery fail for one address and not another.
			 *
			 * The real error goes to the server log, where LG-1's Pino redaction
			 * applies, and never to the client: raw transport errors disclose
			 * host, port and credentials-in-use.
			 */
			sendResetPassword: async ({ user, token }) => {
				try {
					const resetUrl = `${appWebUrl}/reset-password?token=${token}`
					const email = buildResetPasswordEmail({
						resetUrl,
						userEmail: user.email,
					})
					await sendMail(transporter, mailFrom, {
						to: user.email,
						subject: email.subject,
						html: email.html,
						text: email.text,
					})
				} catch (err) {
					// Logged, not returned. The message is deliberately free of the
					// address and the reset URL — both are credentials in this flow.
					console.error("[mailer] password reset email failed:", err)
				}
			},
		},
		socialProviders: {
			google: {
				prompt: "select_account",
				clientId: authEnv.GOOGLE_CLIENT_ID as string,
				clientSecret: authEnv.GOOGLE_CLIENT_SECRET as string,
			},
		},
		trustedOrigins: authEnv.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? [],

		/**
		 * Session lifetime, pinned rather than inherited (AC-3 / F-56).
		 *
		 * These rode library defaults, so the security posture was whatever the
		 * installed version happened to choose and could change under a patch
		 * upgrade without anyone noticing.
		 */
		session: {
			// Absolute lifetime of a session record.
			expiresIn: 60 * 60 * 24 * 7, // 7 days
			// Sliding renewal: an active session is extended once a day, so a
			// user in daily use is not signed out mid-work, while an abandoned
			// session still dies within the window above.
			updateAge: 60 * 60 * 24, // 1 day
			// Cookie cache is deliberately OFF. It serves session data from a
			// signed cookie without hitting the database, which means a revoked
			// session keeps working until the cache lapses — the same staleness
			// AB-2 removed from the RBAC cache, and not worth reintroducing here.
			cookieCache: { enabled: false },
		},

		/**
		 * Account linking, stated explicitly (AC-3 / F-56).
		 *
		 * Trusted providers only, and only ones that verify the address they
		 * assert. Automatic linking on an unverified email is an account-takeover
		 * path: sign up with someone's address at a provider that never checks
		 * it, and you inherit their account.
		 */
		account: {
			accountLinking: {
				enabled: true,
				trustedProviders: ["google"],
				allowDifferentEmails: false,
			},
		},

		advanced: {
			/**
			 * Cookie attributes, pinned (AC-3 / F-58, F-59).
			 *
			 * F-59 asked which SameSite posture applies, because it gates how bad
			 * F-21's clickjacking is. The answer is `lax`, chosen not defaulted:
			 *
			 *  - `strict` breaks the OAuth return leg — the browser drops the
			 *    cookie on the top-level redirect back from Google, so the user
			 *    lands signed out.
			 *  - `none` would let any site send the session cookie on cross-site
			 *    requests, which is exactly the CSRF surface to avoid.
			 *  - `lax` withholds the cookie on cross-site subrequests (the CSRF
			 *    case) while allowing it on top-level navigations (the OAuth
			 *    case).
			 *
			 * With `lax` here and ED-1's `frame-ancestors 'none'`, F-21 is closed
			 * from both directions: the page cannot be framed, and even if it
			 * were, the cookie would not ride a cross-site subrequest.
			 */
			defaultCookieAttributes: {
				httpOnly: true,
				sameSite: "lax",
				// Secure in production only: a Secure cookie is dropped over plain
				// HTTP, which would break local development on http://localhost.
				secure: process.env.NODE_ENV === "production",
				path: "/",
			},
			...(authEnv.BETTER_AUTH_COOKIE_DOMAIN && {
				crossSubDomainCookies: {
					enabled: true,
					domain: authEnv.BETTER_AUTH_COOKIE_DOMAIN,
				},
			}),
		},
		plugins: [
			openAPI({
				path: "/reference",
			}),
		],
	})
}

/**
 * Default Better Auth instance.
 * This is the shared instance used across all apps.
 *
 * Lazy initialization to ensure environment variables are loaded before creating the instance.
 */
let _auth: ReturnType<typeof betterAuth> | null = null

/**
 * Clear the cached auth instance. Call this when configuration changes.
 */
export function clearAuthCache(): void {
	_auth = null
}

export function getAuth(): ReturnType<typeof betterAuth> {
	if (!_auth) {
		_auth = createAuth()
	}
	return _auth!
}

/**
 * Inferred Session type from Better Auth.
 * Export this so web app can use the correct types matching backend config.
 */
export type Session = ReturnType<typeof getAuth>["$Infer"]["Session"]
