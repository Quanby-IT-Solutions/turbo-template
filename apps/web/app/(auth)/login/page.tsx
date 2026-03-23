import { LoginForm } from "@/features/auth/login/components/login-form"

export default function LoginPage() {
	return (
		<section className="flex flex-1 flex-col items-center justify-center">
			<LoginForm className="w-full" />
		</section>
	)
}
