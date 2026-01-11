"use client"

import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Label } from "@/core/components/ui/label"

export default function PermissionsPage() {
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
          title="Permissions Management" 
          description="Configure user roles and permissions"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Role Permissions</CardTitle>
                    <CardDescription>
                      Manage permissions for different user roles
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Admin Role</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="admin-users" defaultChecked />
                          <Label htmlFor="admin-users">Manage Users</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="admin-settings" defaultChecked />
                          <Label htmlFor="admin-settings">Manage Settings</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="admin-reports" defaultChecked />
                          <Label htmlFor="admin-reports">View Reports</Label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold">Doctor Role</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="doctor-patients" defaultChecked />
                          <Label htmlFor="doctor-patients">Manage Patients</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="doctor-schedule" defaultChecked />
                          <Label htmlFor="doctor-schedule">Manage Schedule</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="doctor-reports" />
                          <Label htmlFor="doctor-reports">View Reports</Label>
                        </div>
                      </div>
                    </div>
                    <Button>Save Permissions</Button>
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

