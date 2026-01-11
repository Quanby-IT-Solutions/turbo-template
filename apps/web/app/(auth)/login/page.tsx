import Image from "next/image"
import Link from "next/link"

import { LoginForm } from "@/features/auth/components/login-form"

export default function LoginPage() {
	return (
		<div className="page-transition grid min-h-svh lg:grid-cols-2">
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex justify-center gap-2 md:justify-start">
					<Link href="/" className="flex items-center gap-2 font-medium">
						<Image
							src="/new-logo.png"
							alt="QHealth Logo"
							width={32}
							height={32}
							className="h-8 w-auto object-contain"
						/>
						<span className="text-lg font-bold">QHealth</span>
					</Link>
				</div>
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-xs">
						<LoginForm />
					</div>
				</div>
			</div>
			<div className="relative hidden lg:block overflow-hidden">
				<Image
					src="/download (15).png"
					alt="Healthcare Background"
					fill
					className="object-cover"
					priority
				/>
			</div>
		</div>
	)
}
