"use client"

import * as React from "react"
import { IconBell } from "@tabler/icons-react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"

type FilterType = "all" | "unread" | "read"

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all")
  
  // Mock data - currently no notifications
  const allCount = 0
  const unreadCount = 0
  const readCount = 0

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarWrapper role="super-admin" variant="inset" />
      <SidebarInset>
        <RoleHeader 
          title="Notifications" 
          description="View and manage system notifications"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Title Card */}
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <h2 className="text-lg font-bold">Notifications</h2>
                  </CardContent>
                </Card>

                {/* Filter Buttons */}
                <div className="mb-4 flex gap-2">
                  <Button
                    variant={activeFilter === "all" ? "default" : "outline"}
                    onClick={() => setActiveFilter("all")}
                    className={activeFilter === "all" ? "" : ""}
                  >
                    All {allCount}
                  </Button>
                  <Button
                    variant={activeFilter === "unread" ? "default" : "outline"}
                    onClick={() => setActiveFilter("unread")}
                  >
                    Unread {unreadCount}
                  </Button>
                  <Button
                    variant={activeFilter === "read" ? "default" : "outline"}
                    onClick={() => setActiveFilter("read")}
                  >
                    Read {readCount}
                  </Button>
                </div>

                {/* Empty State */}
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <IconBell className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold">No notifications</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      You're all caught up! No all notifications at the moment.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
