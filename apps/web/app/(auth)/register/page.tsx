import { AnalyticsIdentityStamp } from "@/services/analytics/analytics-identity-stamp"
import { RegisterForm } from "@/features/auth/register/components/register-form"

export default function RegisterPage() {
	return (
		<section className="flex flex-1 flex-col items-center justify-center">
			{/* Signed out: clears a previous user's PostHog identity. */}
			<AnalyticsIdentityStamp userId={null} />
			<RegisterForm className="w-full" />
		</section>
	)
}
