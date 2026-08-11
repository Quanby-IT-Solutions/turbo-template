import { redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar"
import { getSession } from "@/services/better-auth/auth-server"
import { CacheIdentity } from "@/services/tanstack-query/cache-identity"
import { AppSidebar } from "@/features/dashboard/components/app-sidebar"
import { SiteHeader } from "@/features/dashboard/components/site-header"
import { getAccess } from "@/features/dashboard/server/get-access"

export default async function SiteLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const session = await getSession()

	if (!session) {
		redirect("/login")
	}

	const access = await getAccess()
	const user = {
		name: session.user.name ?? null,
		email: session.user.email,
		image: session.user.image ?? null,
	}

	return (
		<SidebarProvider>
			{/* WC-1: scope the persisted cache to this user before anything reads it. */}
			<CacheIdentity />
			<AppSidebar user={user} access={access} />
			<SidebarInset>
				<SiteHeader />
				<div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
					<main className="min-w-0">{children}</main>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
