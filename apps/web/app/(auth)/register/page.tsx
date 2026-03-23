import { RegisterForm } from "@/features/auth/register/components/register-form"

export default function RegisterPage() {
	return (
		<section className="flex flex-1 flex-col items-center justify-center">
			<RegisterForm className="w-full" />
		</section>
	)
}
