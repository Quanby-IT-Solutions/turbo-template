/**
 * Build the password reset email content (subject, HTML, and plain text).
 */
export function buildResetPasswordEmail(opts: { resetUrl: string; userEmail: string }): {
	subject: string
	html: string
	text: string
} {
	const { resetUrl, userEmail } = opts

	const subject = "Reset your password"

	const html = `<!doctype html>
<html>
	<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
			<tr>
				<td align="center">
					<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;padding:32px;">
						<tr>
							<td style="color:#18181b;font-size:20px;font-weight:bold;padding-bottom:16px;">
								Reset your password
							</td>
						</tr>
						<tr>
							<td style="color:#3f3f46;font-size:14px;line-height:22px;padding-bottom:24px;">
								Hi ${userEmail},<br />
								We received a request to reset your password. Click the button below to choose a new one.
							</td>
						</tr>
						<tr>
							<td style="padding-bottom:24px;">
								<a href="${resetUrl}" style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:bold;">
									Reset password
								</a>
							</td>
						</tr>
						<tr>
							<td style="color:#71717a;font-size:12px;line-height:20px;word-break:break-all;">
								If you did not request this, you can ignore this email. To reset manually, copy and paste this URL:<br />
								<a href="${resetUrl}" style="color:#2563eb;">${resetUrl}</a>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>`

	const text = `Reset your password

Hi ${userEmail},

We received a request to reset your password. Open the link below to choose a new one:

${resetUrl}

If you did not request this, you can ignore this email.`

	return { subject, html, text }
}
