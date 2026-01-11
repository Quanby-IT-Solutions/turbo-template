"use client"

import * as React from "react"
import {
  IconClock,
  IconVideo,
  IconFilter,
  IconX,
  IconPlus,
  IconCalendar,
} from "@tabler/icons-react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
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

interface Schedule {
  id: string
  doctor: string
  day: string
  time: string
  duration: string
  status: string
}

export default function SchedulePage() {
  const [activeTab, setActiveTab] = React.useState("doctor-schedules")
  const [selectedDoctor, setSelectedDoctor] = React.useState("")
  const [selectedDay, setSelectedDay] = React.useState("")
  const [selectedDate, setSelectedDate] = React.useState("")

  // Mock data - currently empty
  const schedules: Schedule[] = []
  const availableCount = 0

  const handleClearFilters = () => {
    setSelectedDoctor("")
    setSelectedDay("")
    setSelectedDate("")
  }

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
          title="Schedule Management" 
          description="Manage doctor schedules, consultations, and appointments efficiently"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Header with Add Schedule button */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Schedule Management</h1>
                    <p className="text-sm text-muted-foreground">
                      Manage doctor schedules, consultations, and appointments efficiently
                    </p>
                  </div>
                  <Button>
                    <IconPlus className="h-4 w-4 mr-2" />
                    Add Schedule
                  </Button>
                </div>

                {/* Navigation Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                  <TabsList>
                    <TabsTrigger value="doctor-schedules">
                      <IconClock className="h-4 w-4 mr-2" />
                      Doctor Schedules
                    </TabsTrigger>
                    <TabsTrigger value="consultations">
                      <IconVideo className="h-4 w-4 mr-2" />
                      Consultations
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="doctor-schedules" className="mt-6">
                    {/* Filter Section */}
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Filter Schedules</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                            <SelectTrigger>
                              <SelectValue placeholder="Doctor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Doctors</SelectItem>
                              <SelectItem value="dr-smith">Dr. John Smith</SelectItem>
                              <SelectItem value="dr-johnson">Dr. Sarah Johnson</SelectItem>
                              <SelectItem value="dr-chen">Dr. Michael Chen</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={selectedDay} onValueChange={setSelectedDay}>
                            <SelectTrigger>
                              <SelectValue placeholder="Day of Week" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Days</SelectItem>
                              <SelectItem value="monday">Monday</SelectItem>
                              <SelectItem value="tuesday">Tuesday</SelectItem>
                              <SelectItem value="wednesday">Wednesday</SelectItem>
                              <SelectItem value="thursday">Thursday</SelectItem>
                              <SelectItem value="friday">Friday</SelectItem>
                              <SelectItem value="saturday">Saturday</SelectItem>
                              <SelectItem value="sunday">Sunday</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="relative">
                            <Input
                              type="date"
                              placeholder="dd/mm/yyyy"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="pr-10"
                            />
                            <IconCalendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button>
                            <IconFilter className="h-4 w-4 mr-2" />
                            Apply Filters
                          </Button>
                          <Button variant="outline" onClick={handleClearFilters}>
                            <IconX className="h-4 w-4 mr-2" />
                            Clear Filters
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Schedule Table */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Doctor Schedules</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Showing {schedules.length} schedules ({availableCount} available)
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        {schedules.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                              <IconClock className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="mb-2 text-lg font-bold">No schedules found</h3>
                            <p className="text-sm text-muted-foreground text-center">
                              Add a new doctor schedule to get started.
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>DOCTOR</TableHead>
                                <TableHead>DAY</TableHead>
                                <TableHead>TIME</TableHead>
                                <TableHead>DURATION</TableHead>
                                <TableHead>STATUS</TableHead>
                                <TableHead className="text-right">ACTIONS</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {schedules.map((schedule) => (
                                <TableRow key={schedule.id}>
                                  <TableCell className="font-medium">{schedule.doctor}</TableCell>
                                  <TableCell>{schedule.day}</TableCell>
                                  <TableCell>{schedule.time}</TableCell>
                                  <TableCell>{schedule.duration}</TableCell>
                                  <TableCell>{schedule.status}</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="sm">Edit</Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="consultations" className="mt-6">
                    <Card>
                      <CardContent className="py-16 text-center">
                        <p className="text-muted-foreground">No consultations found</p>
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
