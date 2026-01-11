"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"

import { NavMain } from "./nav-main"
import { NavDocuments } from "./nav-documents"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar"
import type { SidebarData } from "@/core/lib/sidebar-data"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  data: SidebarData
}

export function AppSidebar({ data, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link
                href={data.brandUrl || "#"}
                className="flex w-full items-center justify-center gap-2"
              >
                <Image
                  src="/new-logo.png"
                  alt="QHealth logo"
                  width={120}
                  height={40}
                  className="h-10 w-auto object-contain"
                  priority
                  quality={100}
                  unoptimized
                />
                <span className="text-base font-semibold">{data.brandName || "QHealth"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {data.navDocuments && data.navDocuments.length > 0 && (
          <NavDocuments items={data.navDocuments} />
        )}
        {data.navSecondary && data.navSecondary.length > 0 && (
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
