import { VerifyEmailView } from "@/features/auth/verify-email/components/verify-email-view"

export default async function VerifyEmailPage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string }>
}) {
	const { token } = await searchParams

	return (
		<section className="flex flex-1 flex-col items-center justify-center">
			<div className="w-full max-w-md">
				<VerifyEmailView token={token ?? null} />
			</div>
		</section>
	)
}
