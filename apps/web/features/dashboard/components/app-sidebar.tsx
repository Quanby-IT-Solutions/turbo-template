"use client"

import { useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
	AccountSetting01Icon,
	ArrowDown01Icon,
	ArrowReloadHorizontalIcon,
	Logout01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { type PermissionName } from "@repo/contracts"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/core/components/ui/collapsible"
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
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	SidebarSeparator,
	useSidebar,
} from "@/core/components/ui/sidebar"
import { cn } from "@/core/lib/utils"
import { useSignOutMutation } from "@/features/auth/api/session.hooks"
import { getAccessibleNavItems } from "@/features/dashboard/lib/nav-items"

interface SidebarUser {
	name: string | null
	email: string
	image: string | null
}

type SidebarAccess =
	| {
			status: "loaded"
			roles: string[]
			permissions: PermissionName[]
	  }
	| {
			status: "error"
			roles: []
			permissions: []
	  }

interface AppSidebarProps {
	user: SidebarUser
	access: SidebarAccess
}

function isActivePath(pathname: string, href: string): boolean {
	return pathname === href || pathname.startsWith(`${href}/`)
}

function getInitials(user: SidebarUser): string {
	const source = user.name?.trim() || user.email
	const initials = source
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map(part => part[0]?.toUpperCase())
		.join("")

	return initials || "U"
}

export function AppSidebar({ user, access }: AppSidebarProps) {
	const pathname = usePathname()
	const router = useRouter()
	const { isMobile, setOpenMobile } = useSidebar()
	const signOut = useSignOutMutation()
	const items = getAccessibleNavItems(access)
	const mainItems = items.filter(item => !item.section)
	const adminItems = items.filter(item => item.section === "Administration")
	const isAdminActive = adminItems.some(item => isActivePath(pathname, item.href))
	const displayName = user.name?.trim() || "Account"
	const closeMobileSidebarOnSelect = useCallback(() => {
		if (isMobile) {
			setOpenMobile(false)
		}
	}, [isMobile, setOpenMobile])

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
					<div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
						D
					</div>
					<div className="min-w-0 group-data-[collapsible=icon]:hidden">
						<p className="truncate text-sm font-semibold">Dashboard</p>
						<p className="text-muted-foreground truncate text-xs">Workspace</p>
					</div>
				</div>
			</SidebarHeader>
			<SidebarSeparator />
			<SidebarContent>
				{access.status === "error" ? (
					<SidebarGroup className="group-data-[collapsible=icon]:hidden">
						<div className="border-border bg-muted/40 rounded-md border p-2">
							<p className="text-xs font-medium">Could not load your menu</p>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="mt-2 h-7 px-2 text-xs"
								onClick={() => router.refresh()}
							>
								<HugeiconsIcon
									icon={ArrowReloadHorizontalIcon}
									strokeWidth={2}
									className="size-3.5"
								/>
								Retry
							</Button>
						</div>
					</SidebarGroup>
				) : null}
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{mainItems.map(item => (
								<SidebarMenuItem key={item.href}>
									<SidebarMenuButton
										render={<Link href={item.href} onClick={closeMobileSidebarOnSelect} />}
										isActive={isActivePath(pathname, item.href)}
										tooltip={item.label}
									>
										<HugeiconsIcon icon={item.icon} strokeWidth={2} />
										<span>{item.label}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				{adminItems.length > 0 ? (
					<Collapsible key={isAdminActive ? "active-admin" : "admin"} defaultOpen={isAdminActive}>
						<SidebarGroup>
							<SidebarGroupLabel
								render={
									<CollapsibleTrigger
										className={cn(
											"hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-between",
											isAdminActive && "text-sidebar-accent-foreground"
										)}
									/>
								}
							>
								<span>Administration</span>
								<HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="ml-auto size-4" />
							</SidebarGroupLabel>
							<CollapsibleContent>
								<SidebarGroupContent>
									<SidebarMenu>
										{adminItems.map(item => (
											<SidebarMenuItem key={item.href}>
												<SidebarMenuButton
													render={<Link href={item.href} onClick={closeMobileSidebarOnSelect} />}
													isActive={isActivePath(pathname, item.href)}
													tooltip={item.label}
												>
													<HugeiconsIcon icon={item.icon} strokeWidth={2} />
													<span>{item.label}</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</CollapsibleContent>
						</SidebarGroup>
					</Collapsible>
				) : null}
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger render={<SidebarMenuButton size="lg" tooltip={displayName} />}>
								<Avatar size="sm">
									{user.image ? <AvatarImage src={user.image} alt={displayName} /> : null}
									<AvatarFallback>{getInitials(user)}</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1 text-left">
									<p className="truncate text-sm font-medium">{displayName}</p>
									<p className="text-muted-foreground truncate text-xs">{user.email}</p>
								</div>
								<HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="ml-auto size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent side="top" align="start" className="w-56">
								<DropdownMenuGroup>
									<DropdownMenuLabel>
										<span className="block truncate">{displayName}</span>
										<span className="text-muted-foreground block truncate font-normal">
											{user.email}
										</span>
									</DropdownMenuLabel>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									render={<Link href="/account" onClick={closeMobileSidebarOnSelect} />}
								>
									<HugeiconsIcon icon={AccountSetting01Icon} strokeWidth={2} />
									Profile
								</DropdownMenuItem>
								<DropdownMenuItem
									variant="destructive"
									disabled={signOut.isPending}
									onClick={() => signOut.mutate()}
								>
									<HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
									{signOut.isPending ? "Signing out..." : "Sign out"}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
