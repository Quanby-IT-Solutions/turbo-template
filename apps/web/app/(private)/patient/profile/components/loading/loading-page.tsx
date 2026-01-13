"use client"

import { RoleHeader } from "@/core/components/role-header"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar"

export function LoadingPage() {
	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<SidebarWrapper role="patient" variant="inset" />
			<SidebarInset>
				<RoleHeader title="My Profile" description="Manage your personal information" />
				<div className="flex flex-1 flex-col items-center justify-center p-8">
					<p className="text-muted-foreground">Loading profile...</p>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
