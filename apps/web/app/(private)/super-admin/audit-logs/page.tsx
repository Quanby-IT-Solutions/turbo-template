"use client"

import * as React from "react"
import { IconCalendar } from "@tabler/icons-react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/core/components/ui/tabs"

// Mock data for audit logs
const auditLogs = [
  {
    id: 1,
    timestamp: "11/15/2025, 11:21:22 AM",
    user: "superadmin@qhealth.com",
    userId: "3647e159-1c03-4d65-ae09-60f76db7e4a9",
    action: "VIEW_NOTIFICATIONS",
    category: "DATA ACCESS",
    level: "INFO",
    resource: "NOTIFICATION list",
    modulePage: "Notifications Notifications Page",
    ipAddress: "10.19.107.254",
  },
  {
    id: 2,
    timestamp: "11/15/2025, 11:20:22 AM",
    user: "superadmin@qhealth.com",
    userId: "3647e159-1c03-4d65-ae09-60f76db7e4a9",
    action: "VIEW_NOTIFICATIONS",
    category: "DATA ACCESS",
    level: "INFO",
    resource: "NOTIFICATION list",
    modulePage: "Notifications Notifications Page",
    ipAddress: "10.19.255.241",
  },
  {
    id: 3,
    timestamp: "11/15/2025, 11:19:21 AM",
    user: "superadmin@qhealth.com",
    userId: "3647e159-1c03-4d65-ae09-60f76db7e4a9",
    action: "VIEW_NOTIFICATIONS",
    category: "DATA ACCESS",
    level: "INFO",
    resource: "NOTIFICATION list",
    modulePage: "Notifications Notifications Page",
    ipAddress: "10.18.86.52",
  },
  {
    id: 4,
    timestamp: "11/15/2025, 11:18:22 AM",
    user: "superadmin@qhealth.com",
    userId: "3647e159-1c03-4d65-ae09-60f76db7e4a9",
    action: "VIEW_NOTIFICATIONS",
    category: "DATA ACCESS",
    level: "INFO",
    resource: "NOTIFICATION list",
    modulePage: "Notifications Notifications Page",
    ipAddress: "10.18.86.52",
  },
  {
    id: 5,
    timestamp: "11/15/2025, 11:17:32 AM",
    user: "superadmin@qhealth.com",
    userId: "3647e159-1c03-4d65-ae09-60f76db7e4a9",
    action: "VIEW_NOTIFICATIONS",
    category: "DATA ACCESS",
    level: "INFO",
    resource: "NOTIFICATION list",
    modulePage: "Notifications Notifications Page",
    ipAddress: "10.19.255.241",
  },
]

export default function AuditLogsPage() {
  const [activeTab, setActiveTab] = React.useState("audit-logs")
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredLogs = auditLogs.filter((log) =>
    log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.resource.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          title="Audit Logs & Security Events" 
          description="Monitor system activities, security events, and user actions across the platform."
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">

                {/* Navigation Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                  <TabsList>
                    <TabsTrigger value="audit-logs">
                      Audit Logs <Badge variant="secondary" className="ml-2">391</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="security-events">
                      Security Events <Badge variant="destructive" className="ml-2">0</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="statistics">Statistics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="audit-logs" className="mt-6">
                    {/* Filter Audit Logs Section */}
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Filter Audit Logs</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div className="lg:col-span-2">
                            <Input
                              placeholder="Search logs..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                          <Select defaultValue="all-categories">
                            <SelectTrigger>
                              <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all-categories">All Categories</SelectItem>
                              <SelectItem value="data-access">Data Access</SelectItem>
                              <SelectItem value="user-management">User Management</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select defaultValue="all-levels">
                            <SelectTrigger>
                              <SelectValue placeholder="All Levels" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all-levels">All Levels</SelectItem>
                              <SelectItem value="info">INFO</SelectItem>
                              <SelectItem value="warning">WARNING</SelectItem>
                              <SelectItem value="error">ERROR</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input placeholder="User ID..." />
                          <Input placeholder="Resource type..." />
                          <Select defaultValue="all-modules">
                            <SelectTrigger>
                              <SelectValue placeholder="All Modules" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all-modules">All Modules</SelectItem>
                              <SelectItem value="notifications">Notifications</SelectItem>
                              <SelectItem value="doctors">Doctors</SelectItem>
                              <SelectItem value="patients">Patients</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select defaultValue="all-pages">
                            <SelectTrigger>
                              <SelectValue placeholder="All Pages" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all-pages">All Pages</SelectItem>
                              <SelectItem value="notifications-page">Notifications Page</SelectItem>
                              <SelectItem value="doctors-page">Doctors Page</SelectItem>
                              <SelectItem value="patients-page">Patients Page</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="relative">
                            <Input
                              type="date"
                              placeholder="dd/mm/yyyy"
                              className="pr-10"
                            />
                            <IconCalendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          </div>
                          <div className="relative">
                            <Input
                              type="date"
                              placeholder="dd/mm/yyyy"
                              className="pr-10"
                            />
                            <IconCalendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                        <div className="mt-4">
                          <Button className="w-full md:w-auto">Apply Filters</Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Audit Logs Table */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Audit Logs</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Showing {filteredLogs.length} of 391 logs
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>TIMESTAMP</TableHead>
                                <TableHead>USER</TableHead>
                                <TableHead>ACTION</TableHead>
                                <TableHead>CATEGORY</TableHead>
                                <TableHead>LEVEL</TableHead>
                                <TableHead>RESOURCE</TableHead>
                                <TableHead>MODULE/PAGE</TableHead>
                                <TableHead>IP ADDRESS</TableHead>
                                <TableHead className="text-right">ACTIONS</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredLogs.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    No logs found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredLogs.map((log) => (
                                  <TableRow key={log.id}>
                                    <TableCell className="text-sm">{log.timestamp}</TableCell>
                                    <TableCell>
                                      <div className="text-sm">
                                        <p>{log.user}</p>
                                        <p className="text-muted-foreground text-xs">{log.userId}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm">{log.action}</TableCell>
                                    <TableCell>
                                      <Button variant="link" className="h-auto p-0 text-primary">
                                        {log.category}
                                      </Button>
                                    </TableCell>
                                    <TableCell>
                                      <Button variant="link" className="h-auto p-0 text-primary">
                                        {log.level}
                                      </Button>
                                    </TableCell>
                                    <TableCell className="text-sm">{log.resource}</TableCell>
                                    <TableCell className="text-sm">{log.modulePage}</TableCell>
                                    <TableCell className="text-sm">{log.ipAddress}</TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="link" className="h-auto p-0 text-primary">
                                        View Details
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="security-events" className="mt-6">
                    <Card>
                      <CardContent className="py-16 text-center">
                        <p className="text-muted-foreground">No security events found</p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="statistics" className="mt-6">
                    <Card>
                      <CardContent className="py-16 text-center">
                        <p className="text-muted-foreground">Statistics coming soon</p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
