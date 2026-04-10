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
		<div className="container flex min-h-[calc(100vh-4rem)] flex-col gap-8 py-10">{children}</div>
	)
}
