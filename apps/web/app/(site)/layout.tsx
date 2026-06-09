import { redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar"
import { AppSidebar } from "@/features/dashboard/components/app-sidebar"
import { MobileSiteHeader } from "@/features/dashboard/components/mobile-site-header"
import { getAccess } from "@/features/dashboard/server/get-access"
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

	const access = await getAccess()
	const user = {
		name: session.user.name ?? null,
		email: session.user.email,
		image: session.user.image ?? null,
	}

	return (
		<SidebarProvider>
			<AppSidebar user={user} access={access} />
			<SidebarInset>
				<MobileSiteHeader />
				<div className="container py-8">
					<main className="min-w-0">{children}</main>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
