import Link from "next/link"
import { redirect } from "next/navigation"

import { getSession } from "@/services/better-auth/auth-server"

export default async function SiteLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const session = await getSession()

	if (!session) {
		redirect("/login")
	}

	return (
		<div className="container py-8">
			<div className="grid min-h-[calc(100vh-6rem)] grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
				<aside className="bg-card text-card-foreground hidden rounded-xl border p-4 md:block">
					<nav className="space-y-1">
						<Link
							href="/dashboard"
							className="hover:bg-accent hover:text-accent-foreground block rounded-md px-3 py-2 text-sm font-medium"
						>
							Dashboard
						</Link>
						<Link
							href="/submit-ticket"
							className="hover:bg-accent hover:text-accent-foreground block rounded-md px-3 py-2 text-sm font-medium"
						>
							Submit Ticket
						</Link>
					</nav>
				</aside>
				<main className="min-w-0">{children}</main>
			</div>
		</div>
	)
}
