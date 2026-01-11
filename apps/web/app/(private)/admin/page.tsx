"use client"

import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { ChartAreaInteractive } from "@/core/components/chart-area-interactive"
import { DataTable } from "@/core/components/data-table"
import { RoleHeader } from "@/core/components/role-header"
import { SectionCards } from "@/core/components/section-cards"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"

import data from "@/app/dashboard/data.json"

export default function AdminPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarWrapper role="admin" variant="inset" />
      <SidebarInset>
        <RoleHeader 
          title="Admin Dashboard" 
          description="Manage organization settings and users"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

