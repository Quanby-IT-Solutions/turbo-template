import Link from "next/link"

import { Logo } from "@/core/components/logo"
import { buttonVariants } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

export default function AuthLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="relative flex min-h-screen flex-col bg-background">
			<div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-10">
				<header className="flex flex-col gap-4 text-center">
					<Logo href="/" className="self-center" />
					<p className="text-muted-foreground">
						Authentication powered by Better Auth — connect with email or social providers.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-2 text-sm">
						<Link className={cn(buttonVariants({ variant: "link" }), "px-0")} href="/login">
							Login
						</Link>
						<span aria-hidden="true">•</span>
						<Link className={cn(buttonVariants({ variant: "link" }), "px-0")} href="/register">
							Register
						</Link>
						<span aria-hidden="true">•</span>
						<Link className={cn(buttonVariants({ variant: "link" }), "px-0")} href="/session">
							Session Debugger
						</Link>
					</div>
				</header>
				<main className="flex flex-1 flex-col">{children}</main>
			</div>
		</div>
	)
}
