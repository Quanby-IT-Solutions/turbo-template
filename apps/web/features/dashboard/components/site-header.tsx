"use client"

import { usePathname } from "next/navigation"

import { ThemeToggle } from "@/core/components/theme-toggle"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/core/components/ui/breadcrumb"
import { Separator } from "@/core/components/ui/separator"
import { SidebarTrigger } from "@/core/components/ui/sidebar"
import { getDashboardRouteTitle } from "@/features/dashboard/lib/nav-items"

export function SiteHeader() {
	const pathname = usePathname()
	const title = getDashboardRouteTitle(pathname)

	return (
		<header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
			<SidebarTrigger className="-ml-1" />
			<Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem className="text-muted-foreground hidden sm:inline-flex">
						Workspace
					</BreadcrumbItem>
					<BreadcrumbSeparator className="hidden sm:block" />
					<BreadcrumbItem>
						<BreadcrumbPage className="font-medium">{title}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<div className="ml-auto flex items-center gap-1">
				<ThemeToggle />
			</div>
		</header>
	)
}
