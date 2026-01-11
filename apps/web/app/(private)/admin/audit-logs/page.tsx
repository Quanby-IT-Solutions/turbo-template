"use client"

import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table"

export default function AuditLogsPage() {
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
          title="Audit Logs" 
          description="View organizational activity and audit trails"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="mb-4">
                  <Input placeholder="Search audit logs..." className="w-64" />
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Log</CardTitle>
                    <CardDescription>
                      Complete audit trail of organizational activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Resource</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>2024-01-15 10:30:45</TableCell>
                          <TableCell>admin@example.com</TableCell>
                          <TableCell>User Created</TableCell>
                          <TableCell>Doctor Management</TableCell>
                          <TableCell>
                            <Badge variant="default">Success</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>2024-01-15 09:15:22</TableCell>
                          <TableCell>admin@example.com</TableCell>
                          <TableCell>Record Updated</TableCell>
                          <TableCell>Patient Management</TableCell>
                          <TableCell>
                            <Badge variant="default">Success</Badge>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
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

