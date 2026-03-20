"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HelpCircleIcon, Inbox, SettingsIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/core/components/ui/sidebar"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

import { SubmitTicketForm } from "@/features/tickets/components/submit-ticket-form"

interface NavSecondaryItem {
	title: string
	url: string
	icon: IconSvgElement
}

export function NavSecondary({ items }: { items: NavSecondaryItem[] }) {
	const pathname = usePathname()
	const [isSubmitTicketModalOpen, setIsSubmitTicketModalOpen] = React.useState(false)

	return (
		<SidebarGroup>
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
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
					<SidebarMenuItem>
						<SidebarMenuButton
							onClick={() => setIsSubmitTicketModalOpen(true)}
							tooltip="Submit Ticket"
						>
							<HugeiconsIcon icon={Inbox} strokeWidth={2} />
							<span>Submit Ticket</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
				<Dialog open={isSubmitTicketModalOpen} onOpenChange={setIsSubmitTicketModalOpen}>
					<DialogContent className="sm:max-w-2xl">
						<DialogHeader>
							<DialogTitle>Submit a Ticket</DialogTitle>
							<DialogDescription>
								Tell us what you are facing and our support team will follow up.
							</DialogDescription>
						</DialogHeader>
						<div className="max-h-[70vh] overflow-y-auto pr-1">
							<SubmitTicketForm asCard={false} />
						</div>
					</DialogContent>
				</Dialog>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}

export const secondaryNavItems: NavSecondaryItem[] = [
	{
		title: "Settings",
		url: "/settings",
		icon: SettingsIcon,
	},
	{
		title: "Help",
		url: "/help",
		icon: HelpCircleIcon,
	},
]
