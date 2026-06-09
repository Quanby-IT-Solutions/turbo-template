"use client"

import { usePathname } from "next/navigation"

import { SidebarTrigger } from "@/core/components/ui/sidebar"
import { getDashboardRouteTitle } from "@/features/dashboard/lib/nav-items"

export function MobileSiteHeader() {
	const pathname = usePathname()
	const title = getDashboardRouteTitle(pathname)

	return (
		<header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4 backdrop-blur md:hidden">
			<SidebarTrigger />
			<span className="text-sm font-medium">{title}</span>
		</header>
	)
}
