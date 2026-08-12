import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { sendMail } from "./send-mail.js"
import { buildResetPasswordEmail } from "./templates/reset-password-email.js"
import { buildVerificationEmail } from "./templates/verification-email.js"
import { createTransport, MissingSmtpConfigError } from "./transport-factory.js"

describe("createTransport", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {})
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("selects dev transport when SMTP_HOST is not set", async () => {
		const transporter = createTransport({})

		await expect(
			sendMail(transporter, "test@example.com", {
				to: "user@example.com",
				subject: "Test",
				html: "<p>Hi</p>",
				text: "Hi",
			})
		).resolves.toBeUndefined()
	})

	// LG-1 / RF3. The dev transport serializes and discards, so a production
	// boot that silently fell back to it would look healthy while no user could
	// verify an address or reset a password — and every link went to stdout.
	it("refuses to boot in production without SMTP_HOST", () => {
		expect(() => createTransport({ nodeEnv: "production" })).toThrow(MissingSmtpConfigError)
	})

	it("names the variable to set in the failure message", () => {
		// The operator reads this at 3am; it has to say what to do.
		expect(() => createTransport({ nodeEnv: "production" })).toThrow(/SMTP_HOST/)
	})

	it("boots in production when SMTP_HOST is configured", () => {
		expect(() =>
			createTransport({ nodeEnv: "production", smtpHost: "smtp.example.com", smtpPort: 587 })
		).not.toThrow()
	})

	it.each(["development", "test", undefined])(
		"still allows the dev fallback when NODE_ENV is %s",
		nodeEnv => {
			expect(() => createTransport({ nodeEnv })).not.toThrow()
		}
	)

	it("says out loud that the dev transport does not deliver", () => {
		createTransport({ nodeEnv: "development" })

		// eslint-disable-next-line no-console -- asserting on what the factory writes
		const warning = vi.mocked(console.warn).mock.calls[0]?.[0]
		expect(String(warning)).toMatch(/NOT delivered/i)
	})
})

describe("buildVerificationEmail", () => {
	it("returns subject, html, and text containing the URL", () => {
		const url = "https://app.local/verify-email?token=abc123"
		const email = buildVerificationEmail({
			verificationUrl: url,
			userEmail: "user@example.com",
		})

		expect(email.subject.length).toBeGreaterThan(0)
		expect(email.html).toContain(url)
		expect(email.text).toContain(url)
	})
})

describe("buildResetPasswordEmail", () => {
	it("returns subject, html, and text containing the URL", () => {
		const url = "https://app.local/reset-password?token=abc123"
		const email = buildResetPasswordEmail({
			resetUrl: url,
			userEmail: "user@example.com",
		})

		expect(email.subject.length).toBeGreaterThan(0)
		expect(email.html).toContain(url)
		expect(email.text).toContain(url)
	})
})
