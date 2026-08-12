import type nodemailer from "nodemailer"

/**
 * A fully-rendered email message ready to send.
 */
export type MailMessage = {
	to: string
	subject: string
	html: string
	text: string
}

/**
 * Send an email through the given transport.
 *
 * LG-1 / F-05: this used to write `info.message` — the entire serialized email,
 * verification and password-reset links included — to stdout via `console.log`,
 * bypassing Pino's redaction entirely. Anyone with log access could complete a
 * password reset for any account that had requested one.
 *
 * The dev transport still needs *some* signal that mail was produced, so the
 * envelope is logged and the body is not. Real SMTP errors propagate to the
 * caller, which sanitizes them before they reach a client.
 */
export async function sendMail(
	transporter: nodemailer.Transporter,
	from: string,
	message: MailMessage
): Promise<void> {
	const info = await transporter.sendMail({
		from,
		to: message.to,
		subject: message.subject,
		html: message.html,
		text: message.text,
	})

	// `info.message` is only a string on the dev (`jsonTransport`) transport.
	// Its presence is how we know mail was serialized rather than sent — the
	// value itself is the credential-bearing payload and is never read.
	if (typeof info?.message === "string") {
		console.log(
			`[mailer-dev] serialized (not sent) to=${message.to} subject=${JSON.stringify(
				message.subject
			)} — body and links withheld`
		)
	}
}
