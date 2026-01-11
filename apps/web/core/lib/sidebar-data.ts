import {
	IconBell,
	IconBriefcase,
	IconChartBar,
	IconClock,
	IconCreditCard,
	IconDashboard,
	IconSettings,
	IconUser,
	IconUsers,
	type Icon,
} from "@tabler/icons-react"

export type SidebarMenuItem = {
	title: string
	url: string
	icon: Icon
	subItems?: {
		title: string
		url: string
	}[]
}

export type SidebarData = {
	user: {
		name: string
		email: string
		avatar: string
	}
	navMain: SidebarMenuItem[]
	navDocuments?: SidebarMenuItem[]
	navSecondary?: SidebarMenuItem[]
	brandName?: string
	brandUrl?: string
}

// Super Admin sidebar data
export const superAdminSidebarData: SidebarData = {
	user: {
		name: "Super Admin",
		email: "superadmin@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	brandName: "QHealth",
	brandUrl: "/super-admin",
	navMain: [
		{
			title: "Dashboard",
			url: "/super-admin",
			icon: IconDashboard,
		},
		{
			title: "Notifications",
			url: "/super-admin/notifications",
			icon: IconBell,
		},
		{
			title: "Organization Management",
			url: "/super-admin/organization",
			icon: IconSettings,
		},
		{
			title: "Doctor Management",
			url: "/super-admin/doctors",
			icon: IconBriefcase,
		},
		{
			title: "Patient Management",
			url: "/super-admin/patients",
			icon: IconUsers,
		},
		{
			title: "Subscriptions",
			url: "/super-admin/subscriptions",
			icon: IconCreditCard,
		},
		{
			title: "Audit Logs",
			url: "/super-admin/audit-logs",
			icon: IconClock,
		},
		{
			title: "Reports",
			url: "/super-admin/reports",
			icon: IconChartBar,
		},
	],
}

// Admin sidebar data
export const adminSidebarData: SidebarData = {
	user: {
		name: "Admin User",
		email: "admin@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	brandName: "QHealth",
	brandUrl: "/admin",
	navMain: [
		{
			title: "Dashboard",
			url: "/admin",
			icon: IconDashboard,
		},
		{
			title: "Notifications",
			url: "/admin/notifications",
			icon: IconBell,
		},
		{
			title: "My Profile",
			url: "/admin/profile",
			icon: IconUser,
		},
		{
			title: "Schedule Management",
			url: "/admin/schedule",
			icon: IconClock,
		},
		{
			title: "System Administration",
			url: "/admin/system",
			icon: IconSettings,
			subItems: [
				{
					title: "Settings",
					url: "/admin/system/settings",
				},
				{
					title: "Users",
					url: "/admin/system/users",
				},
				{
					title: "Permissions",
					url: "/admin/system/permissions",
				},
			],
		},
		{
			title: "Doctor Management",
			url: "/admin/doctors",
			icon: IconBriefcase,
		},
		{
			title: "Reports",
			url: "/admin/reports",
			icon: IconChartBar,
		},
		{
			title: "Audit Logs",
			url: "/admin/audit-logs",
			icon: IconClock,
		},
	],
}
