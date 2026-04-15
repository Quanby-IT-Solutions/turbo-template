import Link from "next/link"

import { Logo } from "@/core/components/logo"
import { cn } from "@/core/lib/utils"

export default function AuthLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="bg-background relative flex min-h-screen flex-col">
			<div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-10">
				<header className="flex flex-col gap-4 text-center">
					<Logo href="/" className="self-center" />
					<p className="text-muted-foreground">
						Authentication powered by Better Auth — connect with email or social providers.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-2 text-sm">
						<Link
							className={cn("text-muted-foreground underline-offset-4 hover:underline")}
							href="/login"
						>
							Login
						</Link>
						<span aria-hidden="true">•</span>
						<Link
							className={cn("text-muted-foreground underline-offset-4 hover:underline")}
							href="/register"
						>
							Register
						</Link>
						<span aria-hidden="true">•</span>
						<Link
							className={cn("text-muted-foreground underline-offset-4 hover:underline")}
							href="/session"
						>
							Session Debugger
						</Link>
					</div>
				</header>
				<main className="flex flex-1 flex-col">{children}</main>
			</div>
		</div>
	)
}
