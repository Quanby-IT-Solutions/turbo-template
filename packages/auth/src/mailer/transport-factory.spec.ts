import { describe, expect, it } from "vitest"

import { sendMail } from "./send-mail.js"
import { buildResetPasswordEmail } from "./templates/reset-password-email.js"
import { buildVerificationEmail } from "./templates/verification-email.js"
import { createTransport } from "./transport-factory.js"

describe("createTransport", () => {
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
