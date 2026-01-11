"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/core/components/ui/sidebar"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { notificationsApi, type Notification } from "@/features/notifications/api/notifications-api"
import { IconBell, IconFilter, IconInbox, IconRefresh, IconCheck, IconArchive, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

const priorityBadge = (priority?: string) => {
  const p = priority?.toUpperCase()
  if (p === "HIGH") return <Badge className="bg-red-100 text-red-700" variant="outline">High</Badge>
  if (p === "MEDIUM") return <Badge className="bg-amber-100 text-amber-700" variant="outline">Medium</Badge>
  return <Badge variant="outline">Low</Badge>
}

export default function OrganizationNotificationsPage() {
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"all" | "unread" | "archived">("all")
  const [bulkLoading, setBulkLoading] = React.useState(false)

  const load = React.useCallback(async (tab: "all" | "unread" | "archived") => {
    setLoading(true)
    try {
      const res = await notificationsApi.list({
        isRead: tab === "unread" ? false : undefined,
        isArchived: tab === "archived" ? true : undefined,
        limit: 200,
      })
      if (res.success && res.data) {
        setNotifications(res.data.items || [])
      } else {
        toast.error(res.message || "Failed to load notifications")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load("all")
  }, [load])

  const handleTabChange = (value: string) => {
    const tab = value as "all" | "unread" | "archived"
    setActiveTab(tab)
    load(tab)
  }

  const markRead = async (id: string) => {
    try {
      const res = await notificationsApi.markRead(id)
      if (res.success) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
      } else {
        toast.error(res.message || "Failed to mark as read")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to mark as read")
    }
  }

  const toggleArchive = async (id: string, isArchived: boolean) => {
    try {
      const res = isArchived ? await notificationsApi.unarchive(id) : await notificationsApi.archive(id)
      if (res.success) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isArchived: !isArchived } : n)))
      } else {
        toast.error(res.message || "Update failed")
      }
    } catch (error) {
      console.error(error)
      toast.error("Update failed")
    }
  }

  const deleteOne = async (id: string) => {
    try {
      const res = await notificationsApi.delete(id)
      if (res.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      } else {
        toast.error(res.message || "Failed to delete")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete")
    }
  }

  const markAllRead = async () => {
    setBulkLoading(true)
    try {
      const res = await notificationsApi.markAllRead()
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        toast.success("All notifications marked as read")
      } else {
        toast.error(res.message || "Failed to mark all as read")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to mark all as read")
    } finally {
      setBulkLoading(false)
    }
  }

  const deleteAllRead = async () => {
    setBulkLoading(true)
    try {
      const res = await notificationsApi.deleteAllRead()
      if (res.success) {
        setNotifications((prev) => prev.filter((n) => !n.isRead))
        toast.success("Deleted all read notifications")
      } else {
        toast.error(res.message || "Failed to delete read notifications")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete read notifications")
    } finally {
      setBulkLoading(false)
    }
  }

  const filtered = notifications
    .filter((n) => {
      if (activeTab === "unread") return !n.isRead
      if (activeTab === "archived") return n.isArchived
      return true
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarWrapper role="organization" variant="inset" />
      <SidebarInset>
        <RoleHeader
          title="Notifications"
          description="Activity from doctors, schedules, appointments, and system events."
        />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <IconBell className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Inbox</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Stay on top of approvals, schedules, and appointment events.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => load(activeTab)} disabled={loading}>
                  <IconRefresh className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={markAllRead} disabled={bulkLoading}>
                  <IconCheck className="mr-2 h-4 w-4" />
                  Mark all read
                </Button>
                <Button variant="outline" size="sm" onClick={deleteAllRead} disabled={bulkLoading}>
                  <IconTrash className="mr-2 h-4 w-4" />
                  Delete read
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-full justify-start gap-2 px-2">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
                <TabsContent value={activeTab}>
                  {loading ? (
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground">
                      <IconInbox className="h-10 w-10" />
                      No notifications to show.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((n) => (
                          <TableRow key={n.id} className={!n.isRead ? "bg-primary/5" : ""}>
                            <TableCell className="font-semibold">{n.title}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{n.message}</TableCell>
                            <TableCell>{priorityBadge(n.priority)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(n.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell className="space-x-2 text-right">
                              {!n.isRead && (
                                <Button variant="outline" size="sm" onClick={() => markRead(n.id)}>
                                  Mark read
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={() => toggleArchive(n.id, n.isArchived)}>
                                {n.isArchived ? "Unarchive" : "Archive"}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteOne(n.id)}>
                                <IconTrash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

