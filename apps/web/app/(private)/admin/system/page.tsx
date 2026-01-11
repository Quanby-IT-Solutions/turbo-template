"use client"

import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"

export default function SystemPage() {
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
          title="System Administration" 
          description="Manage system settings and configurations"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Settings</CardTitle>
                      <CardDescription>
                        Configure system settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <a href="/admin/system/settings">Manage Settings</a>
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Users</CardTitle>
                      <CardDescription>
                        Manage system users
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <a href="/admin/system/users">Manage Users</a>
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Permissions</CardTitle>
                      <CardDescription>
                        Configure user permissions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <a href="/admin/system/permissions">Manage Permissions</a>
                      </Button>
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

