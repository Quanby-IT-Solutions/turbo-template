import nodemailer from "nodemailer"

/**
 * SMTP configuration fields used to build a mail transport.
 * When `smtpHost` is absent, a dev transport is used instead.
 */
export type MailTransportOptions = {
	smtpHost?: string
	smtpPort?: number
	smtpUser?: string
	smtpPass?: string
	smtpSecure?: boolean
}

/**
 * Create a nodemailer transport.
 *
 * - When `smtpHost` is set, a real SMTP transport is created.
 * - Otherwise a dev transport (`jsonTransport`) is returned. It serialises the
 *   message to JSON without any network call, so it never throws. This is used
 *   in development where no SMTP server is configured.
 */
export function createTransport(opts: MailTransportOptions): nodemailer.Transporter {
	if (opts.smtpHost) {
		return nodemailer.createTransport({
			host: opts.smtpHost,
			port: opts.smtpPort,
			secure: opts.smtpSecure ?? false,
			...(opts.smtpUser && opts.smtpPass
				? {
						auth: {
							user: opts.smtpUser,
							pass: opts.smtpPass,
						},
					}
				: {}),
		})
	}

	console.warn(
		"[mailer] No SMTP configured (SMTP_HOST unset). Emails will be printed to console via dev transport."
	)

	return nodemailer.createTransport({ jsonTransport: true })
}
