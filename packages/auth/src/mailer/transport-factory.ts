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
	/** Process environment name. Production refuses the dev fallback. */
	nodeEnv?: string
}

/**
 * Thrown when production boots without SMTP configured.
 *
 * Risky Flow **RF3** (fail-closed boot): the previous behaviour silently swapped
 * in `jsonTransport`, which never sends and never throws. Verification and
 * password-reset mail was therefore accepted, serialized, printed, and dropped —
 * so a production deployment could look healthy while no user could ever verify
 * an address or recover an account, and every reset link was written to stdout.
 */
export class MissingSmtpConfigError extends Error {
	constructor() {
		super(
			"SMTP_HOST is not set. Production refuses to start without a real mail transport: " +
				"the development fallback serializes mail instead of sending it, so verification " +
				"and password-reset links would be printed to stdout and never delivered. " +
				"Set SMTP_HOST (and SMTP_PORT / SMTP_USER / SMTP_PASS as your provider requires)."
		)
		this.name = "MissingSmtpConfigError"
	}
}

/**
 * Create a nodemailer transport.
 *
 * - When `smtpHost` is set, a real SMTP transport is created.
 * - In production without `smtpHost`, boot fails (see {@link MissingSmtpConfigError}).
 * - Otherwise a dev transport (`jsonTransport`) is returned. It serialises the
 *   message to JSON without any network call, so it never throws.
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

	if (opts.nodeEnv === "production") {
		throw new MissingSmtpConfigError()
	}

	// Explicit, and deliberately loud about what it does NOT do. The message
	// body is never printed — see `sendMail`, which logs only envelope metadata
	// so a reset link cannot reach a log sink even in development.
	console.warn(
		"[mailer] SMTP_HOST is unset — using the development transport. Mail is serialized, " +
			"NOT delivered. Message bodies and links are not logged; read them from your mail " +
			"catcher or set SMTP_HOST to send for real."
	)

	return nodemailer.createTransport({ jsonTransport: true })
}
