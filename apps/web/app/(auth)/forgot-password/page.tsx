import { AnalyticsIdentityStamp } from "@/services/analytics/analytics-identity-stamp"
import { ForgotPasswordForm } from "@/features/auth/forgot-password/components/forgot-password-form"

export default function ForgotPasswordPage() {
	return (
		<section className="flex flex-1 flex-col items-center justify-center">
			{/* Signed out: clears a previous user's PostHog identity. */}
			<AnalyticsIdentityStamp userId={null} />
			<div className="w-full max-w-md">
				<ForgotPasswordForm className="w-full" />
			</div>
		</section>
	)
}
