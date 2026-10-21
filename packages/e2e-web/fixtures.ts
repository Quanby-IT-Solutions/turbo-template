import { expect, request, type Page } from "@playwright/test"

import {
	E2eAdminPasswordError,
	missingAdminPasswordVariables,
	resolveE2eAdminPassword,
	resolveE2eUserPassword,
} from "./e2e-env"

/**
 * Shared multi-user session fixtures for the security suite (HY-1 / F-54).
 *
 * Every security spec needs the same thing: put a known identity into the
 * browser and assert what it may and may not do. Before this, each spec
 * hand-rolled its own sign-in, which meant three copies of the same retry and
 * cookie-transfer logic drifting apart — and a new ownership or permission test
 * started by copying one of them.
 *
 * The ticket's requirement is that multi-user setup be one line:
 *
 * ```ts
 * await signInAs(page, "admin")   // holds every permission
 * await signInAs(page, "userA")   // an ordinary signed-in user
 * await signInAs(page, "userB")   // a *different* ordinary user
 * ```
 *
 * `userA` and `userB` are what make ownership and idempotency tests meaningful:
 * the claims under test are "B cannot mutate A's row" and "A and B may hold the
 * same idempotency key", neither of which can be written with one account.
 */

const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"

/** The identities the suite knows how to become. */
export type TestRole = "admin" | "userA" | "userB"

export interface TestAccount {
	email: string
	password: string
	name: string
}

/** Email and display name only. Passwords are resolved at sign-in. */
export const ACCOUNTS: Record<TestRole, Pick<TestAccount, "email" | "name">> = {
	// Seeded by `pnpm db:seed`, holds the Admin role. It cannot be
	// self-registered. The password is `E2E_ADMIN_PASSWORD`, or
	// `SEED_ADMIN_PASSWORD` when that override is unset. Neither has a default.
	// `signInAs` fails with where to set them; `trySignInAs("admin")` returns
	// false and names the missing variable. userA and userB use
	// `E2E_TEST_PASSWORD` and `E2E_TEST_PASSWORD_B`, also with no default, and
	// fail before any sign-up when the variable is missing. A 403
	// EMAIL_NOT_VERIFIED does not sign up; run `pnpm db:seed:e2e`.
	admin: {
		email: process.env.E2E_ADMIN_EMAIL ?? "admin@turbo-template.local",
		name: "Admin User",
	},
	// The long-standing e2e account; registered on demand if absent.
	userA: {
		email: process.env.E2E_TEST_EMAIL ?? "test@gmail.com",
		name: process.env.E2E_TEST_NAME ?? "E2E Test User",
	},
	// A second ordinary user. Ownership means nothing without someone to be
	// excluded, so this account exists purely to be "not user A".
	userB: {
		email: process.env.E2E_TEST_EMAIL_B ?? "e2e-user-b@turbo-template.local",
		name: "E2E User B",
	},
}

/** Resolve this role's password at sign-in time. Importing this module does not. */
function resolveAccount(role: TestRole): TestAccount {
	const identity = ACCOUNTS[role]
	const password = role === "admin" ? resolveE2eAdminPassword() : resolveE2eUserPassword(role)
	return { ...identity, password }
}

interface SignInResult {
	ok: boolean
	/** Server's reason when it failed, for a test failure message worth reading. */
	detail: string
	account: TestAccount
}

const UNVERIFIED_SIGN_IN_MESSAGE =
	"Run `pnpm db:seed:e2e`; E2E_TEST_EMAIL must be a pre-verified test user."

/**
 * Milliseconds to wait after a 429. Honours `x-retry-after` (seconds) plus one,
 * capped at 15s. Missing or unusable header keeps the previous 11s fallback.
 */
export function signInRetryDelayMs(retryAfterHeader: string | undefined): number {
	const seconds = Number(retryAfterHeader)
	if (!Number.isFinite(seconds) || seconds < 0) return 11_000
	return Math.min(seconds + 1, 15) * 1_000
}

function isUnverifiedSignIn(status: number, body: string): boolean {
	return status === 403 && /EMAIL_NOT_VERIFIED|email not verified/i.test(body)
}

/**
 * Authenticate against the API and move the cookies into the browser context.
 *
 * An unknown account is registered once, then signed in. A 403
 * EMAIL_NOT_VERIFIED is not that case: sign-up would spend another request
 * and still could not log in. That fails immediately and names `pnpm db:seed:e2e`.
 * A 429 waits for `x-retry-after` and is tried at most twice more.
 */
async function authenticate(page: Page, account: TestAccount): Promise<SignInResult> {
	let detail = ""

	for (let attempt = 1; attempt <= 3; attempt++) {
		const api = await request.newContext({
			baseURL: AUTH_API,
			extraHTTPHeaders: { "Content-Type": "application/json", "Origin": WEB_ORIGIN },
		})

		let res = await api.post("sign-in/email", {
			data: { email: account.email, password: account.password },
		})

		if (res.ok()) {
			const { cookies } = await api.storageState()
			await page.context().addCookies(cookies)
			await api.dispose()
			console.log(`[e2e] sign-in/email 200 for ${account.email}`)
			return { ok: true, detail: "", account }
		}

		let status = res.status()
		let body = await res.text()
		if (isUnverifiedSignIn(status, body)) {
			await api.dispose()
			return {
				ok: false,
				detail: `403 EMAIL_NOT_VERIFIED for ${account.email}. ${UNVERIFIED_SIGN_IN_MESSAGE}`,
				account,
			}
		}

		// Unknown account: create it, then sign in. Never for the admin, which
		// the seeder owns — silently registering it would produce a second,
		// unprivileged "admin" and make later permission assertions nonsense.
		// Never after EMAIL_NOT_VERIFIED (handled above).
		if (status !== 429 && account.email !== ACCOUNTS.admin.email) {
			await api.post("sign-up/email", {
				data: { email: account.email, password: account.password, name: account.name },
			})
			res = await api.post("sign-in/email", {
				data: { email: account.email, password: account.password },
			})
			if (res.ok()) {
				const { cookies } = await api.storageState()
				await page.context().addCookies(cookies)
				await api.dispose()
				console.log(`[e2e] sign-in/email 200 for ${account.email}`)
				return { ok: true, detail: "", account }
			}
			status = res.status()
			body = await res.text()
			if (isUnverifiedSignIn(status, body)) {
				await api.dispose()
				return {
					ok: false,
					detail: `403 EMAIL_NOT_VERIFIED for ${account.email}. ${UNVERIFIED_SIGN_IN_MESSAGE}`,
					account,
				}
			}
		}

		detail = `${status} ${body}`
		const retryAfter = res.headers()["x-retry-after"]
		await api.dispose()

		if (status !== 429 || attempt === 3) break
		const waitMs = signInRetryDelayMs(retryAfter)
		console.log(
			`[e2e] sign-in/email 429 for ${account.email}; waiting ${waitMs}ms (x-retry-after=${retryAfter ?? "absent"}) before retry ${attempt}`
		)
		await page.waitForTimeout(waitMs)
	}

	return { ok: false, detail, account }
}

/**
 * Become one of the known identities. Fails the test with the server's reason
 * if it cannot, rather than leaving a later assertion to fail obscurely.
 *
 * Returns the account so a test can assert against its email without repeating
 * the address.
 */
export async function signInAs(page: Page, role: TestRole): Promise<TestAccount> {
	const result = await authenticate(page, resolveAccount(role))
	expect(result.ok, `sign-in as ${role} (${result.account.email}) failed: ${result.detail}`).toBe(
		true
	)
	return result.account
}

/**
 * Try to become an identity, reporting whether it worked.
 *
 * For the admin specifically: an environment without seeded data has no admin,
 * and a test that merely needs "some signed-in user" should degrade rather than
 * fail. Tests asserting admin-only behaviour should use {@link signInAs}.
 */
export async function trySignInAs(page: Page, role: TestRole): Promise<boolean> {
	let account: TestAccount
	try {
		account = resolveAccount(role)
	} catch (error) {
		if (role === "admin" && error instanceof E2eAdminPasswordError) {
			const missing = missingAdminPasswordVariables()
			console.log(`trySignInAs("admin"): missing ${missing.join(" and ")}`)
			return false
		}
		throw error
	}
	return (await authenticate(page, account)).ok
}

/** Drop all cookies, returning the context to an anonymous visitor. */
export async function signOutCompletely(page: Page): Promise<void> {
	await page.context().clearCookies()
}
