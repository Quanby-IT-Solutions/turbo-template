import { defineConfig, devices } from "@playwright/test"

import { AUTH_FILE } from "./constants"

const hasBackend = !!process.env.E2E_AUTH_API_URL

export default defineConfig({
	globalSetup: "./global-setup.ts",
	globalTeardown: "./global-teardown.ts",
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [["html", { open: "never" }]] : "html",
	use: {
		baseURL: process.env.BASE_URL ?? "http://localhost:3001",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "off",
	},
	// The URL is derived from BASE_URL rather than hard-coded.
	// It was pinned to :3001, so pointing BASE_URL at any other port still made
	// Playwright start (and fail to start) a second server on :3001 — the suite
	// could only ever run against one address.
	//
	// Skipped entirely when E2E_NO_WEBSERVER is set, for runs against a server
	// someone else is managing.
	webServer: process.env.E2E_NO_WEBSERVER
		? undefined
		: {
				command: "pnpm turbo run start --filter=@repo/web",
				url: process.env.BASE_URL ?? "http://localhost:3001",
				timeout: 120_000,
				reuseExistingServer: !process.env.CI,
			},
	projects: [
		// ── Auth setup (runs once before authenticated tests) ──────────────────
		...(hasBackend
			? [
					{
						name: "setup",
						testDir: ".",
						testMatch: /global\.setup\.ts/,
						// userA, admin, then userB, one after the other. Two workers would
						// spend the sign-in budget in the same instant.
						fullyParallel: false,
						workers: 1,
					},
				]
			: []),

		// ── Unauthenticated tests ──────────────────────────────────────────────
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
			// auth-negative signs in on purpose and must not run beside setup.
			testIgnore: [/authenticated\.spec\.ts/, /auth-negative\.spec\.ts/],
		},

		// ── Authenticated tests (only when backend is available) ───────────────
		...(hasBackend
			? [
					{
						name: "chromium-authenticated",
						use: {
							...devices["Desktop Chrome"],
							storageState: AUTH_FILE,
						},
						testMatch: /authenticated\.spec\.ts/,
						dependencies: ["setup"],
					},
					{
						name: "chromium-auth-negative",
						use: { ...devices["Desktop Chrome"] },
						testMatch: /auth-negative\.spec\.ts/,
						dependencies: ["setup"],
					},
				]
			: []),
	],
})
