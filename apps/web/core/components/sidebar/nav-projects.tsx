"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { ArrowDown, ChevronRight, FolderOpen, Plus } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/core/components/ui/sidebar"

interface Project {
	id: string
	name: string
	url: string
}

export function NavProjects({ projects }: { projects?: Project[] }) {
	const pathname = usePathname()

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Projects</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							render={<a href="/projects/new" />}
							isActive={false}
							tooltip="Create Project"
						>
							<HugeiconsIcon icon={Plus} strokeWidth={2} />
							<span>Create Project</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					{projects?.map(project => (
						<SidebarMenuItem key={project.id}>
							<SidebarMenuButton
								render={<a href={project.url} />}
								isActive={pathname === project.url}
								tooltip={project.name}
							>
								<HugeiconsIcon icon={FolderOpen} strokeWidth={2} />
								<span>{project.name}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
					<SidebarMenuItem>
						<SidebarMenuButton render={<a href="/projects" />} tooltip="View All Projects">
							<HugeiconsIcon icon={ChevronRight} strokeWidth={2} />
							<span>View All Projects</span>
							<HugeiconsIcon icon={ArrowDown} className="ml-auto size-4" strokeWidth={2} />
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}

export const demoProjects: Project[] = [
	{
		id: "1",
		name: "Project Alpha",
		url: "/projects/alpha",
	},
	{
		id: "2",
		name: "Project Beta",
		url: "/projects/beta",
	},
	{
		id: "3",
		name: "Project Gamma",
		url: "/projects/gamma",
	},
]
