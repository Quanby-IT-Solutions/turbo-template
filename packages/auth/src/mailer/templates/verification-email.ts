/**
 * Build the verification email content (subject, HTML, and plain text).
 */
export function buildVerificationEmail(opts: { verificationUrl: string; userEmail: string }): {
	subject: string
	html: string
	text: string
} {
	const { verificationUrl, userEmail } = opts

	const subject = "Verify your email address"

	const html = `<!doctype html>
<html>
	<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
			<tr>
				<td align="center">
					<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;padding:32px;">
						<tr>
							<td style="color:#18181b;font-size:20px;font-weight:bold;padding-bottom:16px;">
								Verify your email
							</td>
						</tr>
						<tr>
							<td style="color:#3f3f46;font-size:14px;line-height:22px;padding-bottom:24px;">
								Hi ${userEmail},<br />
								Please confirm your email address by clicking the button below.
							</td>
						</tr>
						<tr>
							<td style="padding-bottom:24px;">
								<a href="${verificationUrl}" style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:bold;">
									Verify email
								</a>
							</td>
						</tr>
						<tr>
							<td style="color:#71717a;font-size:12px;line-height:20px;word-break:break-all;">
								If the button does not work, copy and paste this URL into your browser:<br />
								<a href="${verificationUrl}" style="color:#2563eb;">${verificationUrl}</a>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>`

	const text = `Verify your email

Hi ${userEmail},

Please confirm your email address by opening the link below:

${verificationUrl}`

	return { subject, html, text }
}
