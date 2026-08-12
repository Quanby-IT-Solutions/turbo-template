import { expect, request, type Page } from "@playwright/test"

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

export const ACCOUNTS: Record<TestRole, TestAccount> = {
	// Seeded by `pnpm db:seed`, holds the Admin role.
	//
	// Unlike the other two this account cannot be self-registered, so its
	// password has to match what the database was seeded with. Seeding without
	// `SEED_ADMIN_PASSWORD` generates a random one (AC-2) and prints it once —
	// after which this default stops working and admin-only tests degrade or
	// fail. Seed with:
	//
	//   SEED_ADMIN_PASSWORD=$E2E_ADMIN_PASSWORD pnpm db:seed -- --force-password
	admin: {
		email: process.env.E2E_ADMIN_EMAIL ?? "admin@turbo-template.local",
		password: process.env.E2E_ADMIN_PASSWORD ?? "Password123",
		name: "Admin User",
	},
	// The long-standing e2e account; registered on demand if absent.
	userA: {
		email: process.env.E2E_TEST_EMAIL ?? "test@gmail.com",
		password: process.env.E2E_TEST_PASSWORD ?? "Password123",
		name: process.env.E2E_TEST_NAME ?? "E2E Test User",
	},
	// A second ordinary user. Ownership means nothing without someone to be
	// excluded, so this account exists purely to be "not user A".
	userB: {
		email: process.env.E2E_TEST_EMAIL_B ?? "e2e-user-b@turbo-template.local",
		password: process.env.E2E_TEST_PASSWORD_B ?? "Password123",
		name: "E2E User B",
	},
}

interface SignInResult {
	ok: boolean
	/** Server's reason when it failed, for a test failure message worth reading. */
	detail: string
	account: TestAccount
}

/**
 * Authenticate against the API and move the cookies into the browser context.
 *
 * Registers the account when sign-in reports unknown credentials, so a fresh
 * database needs no manual setup. Retries a 429 because Better Auth rate-limits
 * `sign-in/email` per path, and a suite that signs in several times trips a
 * limit that has nothing to do with what is under test.
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

		// Unknown account: create it, then sign in. Never for the admin, which
		// the seeder owns — silently registering it would produce a second,
		// unprivileged "admin" and make later permission assertions nonsense.
		if (!res.ok() && res.status() !== 429 && account.email !== ACCOUNTS.admin.email) {
			await api.post("sign-up/email", {
				data: { email: account.email, password: account.password, name: account.name },
			})
			res = await api.post("sign-in/email", {
				data: { email: account.email, password: account.password },
			})
		}

		if (res.ok()) {
			const { cookies } = await api.storageState()
			await page.context().addCookies(cookies)
			await api.dispose()
			return { ok: true, detail: "", account }
		}

		const status = res.status()
		detail = `${status} ${await res.text()}`
		await api.dispose()

		if (status !== 429) break
		await page.waitForTimeout(11_000)
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
	const result = await authenticate(page, ACCOUNTS[role])
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
	return (await authenticate(page, ACCOUNTS[role])).ok
}

/** Drop all cookies, returning the context to an anonymous visitor. */
export async function signOutCompletely(page: Page): Promise<void> {
	await page.context().clearCookies()
}
