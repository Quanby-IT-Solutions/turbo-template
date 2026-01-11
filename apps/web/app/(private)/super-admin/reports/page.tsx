"use client"

import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import { ChartAreaInteractive } from "@/core/components/chart-area-interactive"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"

export default function ReportsPage() {
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
          title="Reports" 
          description="Generate and view system reports"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Select defaultValue="last-month">
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-week">Last Week</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="last-quarter">Last Quarter</SelectItem>
                        <SelectItem value="last-year">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button>Generate Report</Button>
                </div>
                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>System Overview</CardTitle>
                      <CardDescription>
                        Overall system statistics and metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="px-4 lg:px-6">
                        <ChartAreaInteractive />
                      </div>
                    </CardContent>
                  </Card>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>User Activity Report</CardTitle>
                        <CardDescription>
                          User engagement and activity metrics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Users</span>
                            <span className="font-medium">1,234</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Active Users</span>
                            <span className="font-medium">892</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">New Users (This Month)</span>
                            <span className="font-medium">156</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>System Performance</CardTitle>
                        <CardDescription>
                          System health and performance metrics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Uptime</span>
                            <span className="font-medium">99.9%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Average Response Time</span>
                            <span className="font-medium">120ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Error Rate</span>
                            <span className="font-medium">0.01%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

