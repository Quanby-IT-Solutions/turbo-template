import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { sendMail } from "./send-mail.js"
import { buildResetPasswordEmail } from "./templates/reset-password-email.js"

/**
 * AC-4 / F-18 — the password-reset path must not become an enumeration oracle.
 *
 * Better Auth already returns the same generic response whether or not the
 * account exists. What broke that was `sendResetPassword` letting a transport
 * error escape: a mailable address 200'd while an SMTP failure 500'd, so
 * anyone able to make delivery fail for one address and not another could tell
 * the two apart. These assert the shape the config now relies on.
 */

const RESET_URL = "https://app.local/reset-password?token=live-token-9f3a"

/** The config's handler, reduced to the behaviour under test. */
async function sendResetOrSwallow(transporter: Parameters<typeof sendMail>[0], to: string) {
	try {
		const email = buildResetPasswordEmail({ resetUrl: RESET_URL, userEmail: to })
		await sendMail(transporter, "noreply@example.com", {
			to,
			subject: email.subject,
			html: email.html,
			text: email.text,
		})
	} catch (err) {
		console.error("[mailer] password reset email failed:", err)
	}
}

let logged: string[]

beforeEach(() => {
	logged = []
	vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
		logged.push(args.map(String).join(" "))
	})
	vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
		logged.push(args.map(String).join(" "))
	})
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe("password-reset send failures", () => {
	it("does not throw when the transport fails", async () => {
		// A throw here would surface as a 5xx and distinguish this address from
		// one whose mail was delivered.
		const transporter = {
			sendMail: vi.fn().mockRejectedValue(new Error("ECONNREFUSED smtp.internal:587")),
		} as unknown as Parameters<typeof sendMail>[0]

		await expect(sendResetOrSwallow(transporter, "user@example.com")).resolves.toBeUndefined()
	})

	it("behaves identically whether or not delivery succeeds", async () => {
		const ok = {
			sendMail: vi.fn().mockResolvedValue({ messageId: "<x@example.com>" }),
		} as unknown as Parameters<typeof sendMail>[0]
		const broken = {
			sendMail: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
		} as unknown as Parameters<typeof sendMail>[0]

		const a = await sendResetOrSwallow(ok, "user@example.com").then(
			() => "resolved",
			() => "rejected"
		)
		const b = await sendResetOrSwallow(broken, "user@example.com").then(
			() => "resolved",
			() => "rejected"
		)

		expect(a).toBe(b)
	})

	it("logs the real transport error server-side", async () => {
		const transporter = {
			sendMail: vi.fn().mockRejectedValue(new Error("ECONNREFUSED smtp.internal:587")),
		} as unknown as Parameters<typeof sendMail>[0]

		await sendResetOrSwallow(transporter, "user@example.com")

		expect(logged.join("\n")).toMatch(/password reset email failed/i)
		expect(logged.join("\n")).toMatch(/ECONNREFUSED/)
	})

	it("never writes the reset link or its token to the log", async () => {
		// LG-1 removed the body from the dev mailer's output; this keeps the
		// reset path honest too.
		const transporter = {
			sendMail: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
		} as unknown as Parameters<typeof sendMail>[0]

		await sendResetOrSwallow(transporter, "user@example.com")

		const output = logged.join("\n")
		expect(output).not.toContain(RESET_URL)
		expect(output).not.toContain("live-token-9f3a")
	})
})
