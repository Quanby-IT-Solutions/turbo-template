"use client"

import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"

export default function PatientRecordsPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarWrapper role="doctor" variant="inset" />
      <SidebarInset>
        <RoleHeader 
          title="Patient Records" 
          description="Access and manage patient medical records"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="mb-4 flex items-center justify-between">
                  <Input placeholder="Search patient records..." className="w-64" />
                  <Button>Add New Record</Button>
                </div>
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>John Doe</CardTitle>
                          <CardDescription>Patient ID: PAT-001 • Age: 45 • Last Visit: Jan 15, 2024</CardDescription>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Diagnosis: Hypertension</p>
                          <p className="text-sm text-muted-foreground">Last Updated: 2 days ago</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">View Records</Button>
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Jane Smith</CardTitle>
                          <CardDescription>Patient ID: PAT-002 • Age: 32 • Last Visit: Jan 14, 2024</CardDescription>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Diagnosis: Diabetes Type 2</p>
                          <p className="text-sm text-muted-foreground">Last Updated: 3 days ago</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">View Records</Button>
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
                      </div>
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

