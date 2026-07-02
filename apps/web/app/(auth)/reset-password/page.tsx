import { ResetPasswordForm } from "@/features/auth/reset-password/components/reset-password-form"

export default async function ResetPasswordPage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string }>
}) {
	const { token } = await searchParams

	return (
		<section className="flex flex-1 flex-col items-center justify-center">
			<div className="w-full max-w-md">
				<ResetPasswordForm token={token ?? null} className="w-full" />
			</div>
		</section>
	)
}
