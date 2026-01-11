"use client"

import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Badge } from "@/core/components/ui/badge"

export default function NotificationsPage() {
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
        <RoleHeader 
          title="Notifications" 
          description="View and manage your notifications"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Appointment Reminder</CardTitle>
                          <CardDescription>1 hour ago</CardDescription>
                        </div>
                        <Badge variant="destructive">New</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        Your appointment with Dr. Sarah Johnson is scheduled for tomorrow at 10:00 AM.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Lab Results Available</CardTitle>
                          <CardDescription>2 days ago</CardDescription>
                        </div>
                        <Badge variant="secondary">Read</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        Your recent lab test results are now available for review.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

