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
 * On the dev transport (`jsonTransport`), the serialised message is logged so
 * developers can inspect the email content. Real SMTP errors propagate to the
 * caller.
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

	if (typeof info?.message === "string") {
		console.log("[mailer-dev]", info.message)
	}
}
