import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { sendMail } from "./send-mail.js"
import { buildResetPasswordEmail } from "./templates/reset-password-email.js"
import { buildVerificationEmail } from "./templates/verification-email.js"
import { createTransport } from "./transport-factory.js"

// LG-1 / F-05: the dev transport used to write the whole serialized message —
// verification and password-reset links included — to stdout via console.log,
// bypassing Pino redaction entirely. Anyone with log access could complete a
// password reset for any account that had requested one.

const RESET_TOKEN = "live-reset-token-9f3a"
const RESET_URL = `https://app.local/reset-password?token=${RESET_TOKEN}`
const VERIFY_TOKEN = "live-verify-token-2b7c"
const VERIFY_URL = `https://app.local/verify-email?token=${VERIFY_TOKEN}`

function captureStdout() {
	const lines: string[] = []
	vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
		lines.push(args.map(String).join(" "))
	})
	vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
		lines.push(args.map(String).join(" "))
	})
	return lines
}

describe("sendMail on the dev transport", () => {
	let logged: string[]

	beforeEach(() => {
		logged = captureStdout()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("never writes a password-reset link or its token", async () => {
		const transporter = createTransport({})

		await sendMail(transporter, "noreply@example.com", {
			to: "user@example.com",
			...buildResetPasswordEmail({ resetUrl: RESET_URL, userEmail: "user@example.com" }),
		})

		const output = logged.join("\n")
		expect(output).not.toContain(RESET_TOKEN)
		expect(output).not.toContain(RESET_URL)
		expect(output).not.toContain("reset-password?token=")
	})

	it("never writes a verification link or its token", async () => {
		const transporter = createTransport({})

		await sendMail(transporter, "noreply@example.com", {
			to: "user@example.com",
			...buildVerificationEmail({ verificationUrl: VERIFY_URL, userEmail: "user@example.com" }),
		})

		const output = logged.join("\n")
		expect(output).not.toContain(VERIFY_TOKEN)
		expect(output).not.toContain(VERIFY_URL)
	})

	it("never writes the html or text body", async () => {
		const transporter = createTransport({})
		const message = {
			to: "user@example.com",
			...buildResetPasswordEmail({ resetUrl: RESET_URL, userEmail: "user@example.com" }),
		}

		await sendMail(transporter, "noreply@example.com", message)

		const output = logged.join("\n")
		expect(output).not.toContain(message.html)
		expect(output).not.toContain(message.text)
	})

	it("still reports that mail was produced, so the flow is debuggable", async () => {
		const transporter = createTransport({})

		await sendMail(transporter, "noreply@example.com", {
			to: "user@example.com",
			subject: "Reset your password",
			html: `<a href="${RESET_URL}">reset</a>`,
			text: RESET_URL,
		})

		const output = logged.join("\n")
		expect(output).toContain("user@example.com")
		expect(output).toContain("Reset your password")
		expect(output).toMatch(/not sent|withheld/i)
	})

	it("logs nothing extra on a real SMTP transport", async () => {
		// `info.message` is only a string on jsonTransport. A real transport must
		// not trip the dev branch.
		const transporter = {
			sendMail: vi.fn().mockResolvedValue({ messageId: "<abc@example.com>" }),
		} as unknown as Parameters<typeof sendMail>[0]

		await sendMail(transporter, "noreply@example.com", {
			to: "user@example.com",
			subject: "Reset your password",
			html: `<a href="${RESET_URL}">reset</a>`,
			text: RESET_URL,
		})

		expect(logged).toEqual([])
	})

	it("lets a real SMTP failure propagate to the caller", async () => {
		// AC-4 sanitizes it into a generic response; swallowing it here would
		// make that impossible and hide a broken mail server.
		const transporter = {
			sendMail: vi.fn().mockRejectedValue(new Error("ECONNREFUSED smtp.internal:587")),
		} as unknown as Parameters<typeof sendMail>[0]

		await expect(
			sendMail(transporter, "noreply@example.com", {
				to: "user@example.com",
				subject: "Reset your password",
				html: "<p>x</p>",
				text: "x",
			})
		).rejects.toThrow(/ECONNREFUSED/)
	})
})
