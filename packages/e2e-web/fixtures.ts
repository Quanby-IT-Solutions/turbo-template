import fs from "fs"
import os from "os"
import path from "path"
import { expect, request, test, type Page } from "@playwright/test"

import {
	E2eAdminPasswordError,
	missingAdminPasswordVariables,
	resolveE2eAdminPassword,
	resolveE2eUserPassword,
} from "./e2e-env"
import { pageShowsFailedSessionRead } from "./session-read-recovery"

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
	// fail before any request when the variable is missing. Sign-in does not
	// register an account. A missing or unverified user needs `pnpm db:seed:e2e`.
	admin: {
		email: process.env.E2E_ADMIN_EMAIL ?? "admin@turbo-template.local",
		name: "Admin User",
	},
	// Ordinary user from `pnpm db:seed:e2e`, already verified.
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

const SEEDED_USER_MESSAGE =
	"Run `pnpm db:seed:e2e`; it stores this run's password on the pre-verified user."

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
 * userA and userB come from `pnpm db:seed:e2e`. This does not register an
 * account: a sign-up would leave an unverified user when verification is
 * required, and it cannot replace a password already stored. A 403
 * EMAIL_NOT_VERIFIED or a 401 fails immediately and names that seed. A 429
 * waits for `x-retry-after` and is tried at most twice more.
 */
async function authenticate(page: Page, account: TestAccount): Promise<SignInResult> {
	let detail = ""

	for (let attempt = 1; attempt <= 3; attempt++) {
		const api = await request.newContext({
			baseURL: AUTH_API,
			extraHTTPHeaders: { "Content-Type": "application/json", "Origin": WEB_ORIGIN },
		})

		const res = await api.post("sign-in/email", {
			data: { email: account.email, password: account.password },
		})

		if (res.ok()) {
			const { cookies } = await api.storageState()
			await page.context().addCookies(cookies)
			await api.dispose()
			console.log(`[e2e] sign-in/email 200 for ${account.email}`)
			return { ok: true, detail: "", account }
		}

		const status = res.status()
		const body = await res.text()
		const retryAfter = res.headers()["x-retry-after"]
		await api.dispose()

		if (isUnverifiedSignIn(status, body)) {
			return {
				ok: false,
				detail: `403 EMAIL_NOT_VERIFIED for ${account.email}. ${SEEDED_USER_MESSAGE}`,
				account,
			}
		}

		if (status === 401) {
			return {
				ok: false,
				detail: `401 for ${account.email}. ${SEEDED_USER_MESSAGE}`,
				account,
			}
		}

		detail = `${status} ${body}`
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

const SIGN_OUT_TURN = path.join(os.tmpdir(), "turbo-template-e2e-signout-turn")
const SESSION_READ_COOLDOWN = path.join(os.tmpdir(), "turbo-template-e2e-session-cooldown")

function signOutRetryDelayMs(retryAfterHeader: string | undefined): number {
	const seconds = Number(retryAfterHeader)
	if (!Number.isFinite(seconds) || seconds < 0) return 11_000
	// The credential window is 60s. Wait for the header, and no longer than that.
	return Math.min(seconds + 1, 61) * 1_000
}

function processAlive(pid: number): boolean {
	try {
		process.kill(pid, 0)
		return true
	} catch {
		return false
	}
}

/**
 * One sign-out at a time across workers. Logout shares the credential budget,
 * so two workers clicking together spend it twice.
 */
async function withSignOutTurn<T>(body: () => Promise<T>): Promise<T> {
	const started = Date.now()
	for (;;) {
		try {
			fs.mkdirSync(SIGN_OUT_TURN)
			fs.writeFileSync(path.join(SIGN_OUT_TURN, "pid"), String(process.pid))
			break
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code
			if (code !== "EEXIST") throw error
			const pidFile = path.join(SIGN_OUT_TURN, "pid")
			const holder = Number(fs.existsSync(pidFile) ? fs.readFileSync(pidFile, "utf8") : "")
			if (!processAlive(holder)) {
				fs.rmSync(SIGN_OUT_TURN, { recursive: true, force: true })
				continue
			}
			if (Date.now() - started > 150_000) {
				throw new Error("sign-out turn stayed locked for 150s")
			}
			await new Promise(resolve => setTimeout(resolve, 50))
		}
	}

	try {
		return await body()
	} finally {
		fs.rmSync(SIGN_OUT_TURN, { recursive: true, force: true })
	}
}

function sessionReadRetryDelayMs(retryAfterHeader: string | undefined): number {
	if (retryAfterHeader === undefined || retryAfterHeader.trim() === "") return 61_000
	const seconds = Number(retryAfterHeader)
	if (!Number.isFinite(seconds) || seconds < 0) return 61_000
	return Math.min(seconds + 1, 61) * 1_000
}

/** A get-session wait can run 61s. Raise the current test's timeout only when that wait starts. */
function ensureHarnessTimeout(ms: number): void {
	const info = test.info()
	if (info.timeout < ms) test.setTimeout(ms)
}

function readCooldownUntil(): number {
	try {
		const until = Number(fs.readFileSync(SESSION_READ_COOLDOWN, "utf8"))
		return Number.isFinite(until) ? until : 0
	} catch {
		return 0
	}
}

function pushSessionReadCooldown(waitMs: number): void {
	const until = Date.now() + waitMs
	if (until > readCooldownUntil()) fs.writeFileSync(SESSION_READ_COOLDOWN, String(until))
}

/** Both workers share one session-read budget. Whoever hits 429 parks everyone until it clears. */
async function waitOutSessionReadCooldown(): Promise<void> {
	for (;;) {
		const remaining = readCooldownUntil() - Date.now()
		if (remaining <= 0) return
		ensureHarnessTimeout(180_000)
		await new Promise(resolve => setTimeout(resolve, Math.min(remaining, 250)))
	}
}

/**
 * A cookie plus a 429 means the shared session-read limit, not a signed-out user.
 * Returns how long to wait, or null when this page is genuinely signed out.
 */
async function sessionReadDelayMs(page: Page): Promise<number | null> {
	const authApi = process.env.E2E_AUTH_API_URL
	if (!authApi) return null
	const cookies = await page.context().cookies()
	if (!cookies.some(cookie => cookie.name === "better-auth.session_token")) return null

	const base = authApi.endsWith("/") ? authApi : `${authApi}/`
	// `E2E_AUTH_API_URL` already ends at `/auth/`. get-session lives there,
	// not next to `/me/permissions`.
	const response = await page.request.get(new URL("get-session", base).href, {
		failOnStatusCode: false,
	})
	if (response.status() === 429) return sessionReadRetryDelayMs(response.headers()["x-retry-after"])
	// The document render lost the race with the limit, and the read has since
	// succeeded. Open the route again without waiting.
	if (response.status() === 200) {
		const body = (await response.json().catch(() => null)) as { user?: unknown } | null
		if (body?.user) return 0
	}
	return null
}

type SessionRecoveryPage = Page & {
	__e2eSessionReadRecovery?: boolean
	__e2eSkipSessionRecovery?: boolean
}

/**
 * A server-rendered page treats a limited session read as signed out.
 * When that read returns 429, wait for `x-retry-after` and open the route once more.
 * The repeat uses the original navigation so a second 429 does not wait again.
 */
export function installSessionReadRecovery(page: Page): void {
	const tagged = page as SessionRecoveryPage
	if (tagged.__e2eSessionReadRecovery) return
	tagged.__e2eSessionReadRecovery = true

	const goto = page.goto.bind(page)
	const reload = page.reload.bind(page)

	async function looksSignedOut(requestedPath: string): Promise<boolean> {
		let landed = ""
		try {
			landed = new URL(page.url()).pathname
		} catch {
			landed = ""
		}
		// Protected routes redirect to /login when the session read fails.
		// The login screen has a Login link; a real signed-in page has Logout.
		// The error screen is the same failure once the app stops redirecting.
		if (requestedPath !== "/login" && landed === "/login") return true

		const logout = page.getByRole("button", { name: /logout/i })
		const login = page.getByRole("link", { name: /^login$/i })
		const unavailable = page.getByTestId("session-unavailable")
		const signal = await Promise.race([
			logout
				.waitFor({ state: "visible", timeout: 2_000 })
				.then(() => "in" as const)
				.catch(() => "unknown" as const),
			login
				.waitFor({ state: "visible", timeout: 2_000 })
				.then(() => "out" as const)
				.catch(() => "unknown" as const),
			unavailable
				.waitFor({ state: "visible", timeout: 2_000 })
				.then(() => "limited" as const)
				.catch(() => "unknown" as const),
		])
		return pageShowsFailedSessionRead({
			requestedPath,
			landedPath: landed,
			signal,
		})
	}

	async function maybeRepeat<T>(
		requestedPath: string,
		response: T,
		repeat: () => Promise<T>,
		requestedUrl: string
	): Promise<T> {
		if (tagged.__e2eSkipSessionRecovery) {
			tagged.__e2eSkipSessionRecovery = false
			return response
		}
		if (requestedPath === "/login") return response
		if (!(await looksSignedOut(requestedPath))) return response

		const waitMs = await sessionReadDelayMs(page)
		if (waitMs == null) return response
		if (waitMs > 0) {
			pushSessionReadCooldown(waitMs)
			ensureHarnessTimeout(180_000)
			console.log(`[e2e] get-session 429; waiting ${waitMs}ms (before repeating ${requestedUrl})`)
			await waitOutSessionReadCooldown()
		}
		return repeat()
	}

	page.goto = (async (url: string, options?: Parameters<Page["goto"]>[1]) => {
		await waitOutSessionReadCooldown()
		let requestedPath = ""
		try {
			requestedPath = new URL(url, page.url()).pathname
		} catch {
			requestedPath = ""
		}
		const response = await goto(url, options)
		return maybeRepeat(requestedPath, response, () => goto(url, options), url)
	}) as Page["goto"]

	page.reload = (async (options?: Parameters<Page["reload"]>[0]) => {
		await waitOutSessionReadCooldown()
		let requestedPath = ""
		let requestedUrl = ""
		try {
			const current = new URL(page.url())
			requestedPath = current.pathname
			requestedUrl = current.pathname + current.search
		} catch {
			requestedPath = ""
			requestedUrl = page.url()
		}
		const response = await reload(options)
		return maybeRepeat(requestedPath, response, () => reload(options), requestedUrl)
	}) as Page["reload"]
}

/**
 * Click Logout and wait until the signed-out home shows Login.
 * A 429 on the sign-out request waits for `x-retry-after` and is tried at
 * most twice more, same ceiling as sign-in. The session stays signed in
 * until a request succeeds.
 */
export async function signOutToLogin(page: Page): Promise<void> {
	// Two sign-out 429s can each wait 61s. The test that calls this sets the
	// same ceiling; this covers a caller that has not.
	ensureHarnessTimeout(180_000)
	const logout = page.getByRole("button", { name: /logout/i })
	if (!(await logout.isVisible())) {
		const waitMs = await sessionReadDelayMs(page)
		if (waitMs != null) {
			if (waitMs > 0) {
				pushSessionReadCooldown(waitMs)
				console.log(`[e2e] get-session 429; waiting ${waitMs}ms before sign-out`)
				await waitOutSessionReadCooldown()
			}
			const tagged = page as SessionRecoveryPage
			tagged.__e2eSkipSessionRecovery = true
			await page.goto("/")
		}
	}

	await withSignOutTurn(async () => {
		for (let attempt = 1; attempt <= 3; attempt++) {
			const pending = page.waitForResponse(
				response => response.url().includes("/sign-out") && response.request().method() === "POST"
			)
			await page.getByRole("button", { name: /logout/i }).click()
			const response = await pending
			if (response.ok()) return

			const retryAfter = response.headers()["x-retry-after"]
			if (response.status() !== 429 || attempt === 3) break
			const waitMs = signOutRetryDelayMs(retryAfter)
			console.log(
				`[e2e] sign-out 429; waiting ${waitMs}ms (x-retry-after=${retryAfter ?? "absent"}) before retry ${attempt}`
			)
			await page.waitForTimeout(waitMs)
		}
	})

	await expect(page.getByRole("link", { name: /^login$/i })).toBeVisible()
}
