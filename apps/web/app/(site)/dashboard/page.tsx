import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getSession } from "@/services/better-auth/auth-server"
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview"
import { getAccess } from "@/features/dashboard/server/get-access"

export const metadata: Metadata = {
	title: "Dashboard",
}

export default async function DashboardPage() {
	const session = await getSession()

	if (!session) {
		redirect("/login")
	}

	const access = await getAccess()

	return (
		<DashboardOverview
			user={{ name: session.user.name ?? null, email: session.user.email }}
			access={{ roles: access.roles, permissions: access.permissions }}
		/>
	)
}
