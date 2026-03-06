"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Home, LayoutDashboard } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/core/components/ui/sidebar"

interface NavMainItem {
	title: string
	url: string
	icon: IconSvgElement
	items?: {
		title: string
		url: string
	}[]
	isNew?: boolean
}

export function NavMain({ items }: { items: NavMainItem[] }) {
	const pathname = usePathname()

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Platform</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map(item => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								render={<Link href={item.url} />}
								isActive={pathname === item.url}
								tooltip={item.title}
							>
								<HugeiconsIcon icon={item.icon} strokeWidth={2} />
								<span>{item.title}</span>
								{item.isNew && <Badge className="ml-auto">New</Badge>}
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}

export const mainNavItems: NavMainItem[] = [
	{
		title: "Dashboard",
		url: "/dashboard",
		icon: LayoutDashboard,
	},
	{
		title: "Notifications",
		url: "/notifications",
		icon: Bell,
	},
	{
		title: "Home",
		url: "/home",
		icon: Home,
	},
]
