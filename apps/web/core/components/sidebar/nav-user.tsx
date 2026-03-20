"use client"

import {
	BadgeCheck,
	Bell,
	CreditCardIcon,
	LogoutIcon,
	SparklesIcon,
	UnfoldMoreIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { AuthSession } from "@repo/auth"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/core/components/ui/sidebar"
import { getInitials } from "@/core/lib/utils"
import { authClient } from "@/services/better-auth/auth-client"

export function NavUser({ session }: { session: AuthSession }) {
	const { isMobile } = useSidebar()

	const handleLogout = async () => {
		await authClient.signOut()
		window.location.href = "/login"
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							/>
						}
					>
						<Avatar className="h-8 w-8 rounded-lg">
							<AvatarImage src={session.user?.image ?? undefined} alt={session.user.name} />
							<AvatarFallback className="rounded-lg">
								{getInitials(session.user?.name ?? "") || "CN"}
							</AvatarFallback>
						</Avatar>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">{session.user?.name ?? ""}</span>
							<span className="truncate text-xs">{session.user?.email ?? ""}</span>
						</div>
						<HugeiconsIcon icon={UnfoldMoreIcon} className="ml-auto size-4" strokeWidth={2} />
					</DropdownMenuTrigger>

					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuGroup>
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Avatar className="h-8 w-8 rounded-lg">
										<AvatarImage src={session.user?.image ?? undefined} alt={session.user.name} />
										<AvatarFallback className="rounded-lg">
											{getInitials(session.user?.name ?? "") || "CN"}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">{session.user?.name ?? ""}</span>
										<span className="truncate text-xs">{session.user?.email ?? ""}</span>
									</div>
								</div>
							</DropdownMenuLabel>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
								Upgrade to Pro
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<HugeiconsIcon icon={BadgeCheck} strokeWidth={2} />
								Account
							</DropdownMenuItem>
							<DropdownMenuItem>
								<HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} />
								Billing
							</DropdownMenuItem>
							<DropdownMenuItem>
								<HugeiconsIcon icon={Bell} strokeWidth={2} />
								Notifications
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleLogout}>
							<HugeiconsIcon icon={LogoutIcon} strokeWidth={2} />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
