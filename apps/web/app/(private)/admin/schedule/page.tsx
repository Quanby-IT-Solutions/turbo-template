"use client"

import * as React from "react"
import {
  IconClock,
  IconVideo,
  IconFilter,
  IconX,
  IconPlus,
  IconCalendar,
  IconEdit,
  IconTrash,
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
import { Label } from "@/core/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"
import { Badge } from "@/core/components/ui/badge"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useDoctorSchedules, useCreateDoctorSchedule, useUpdateDoctorSchedule, useDeleteDoctorSchedule } from "@/features/admin/hooks/use-doctor-schedules"
import { useUsers } from "@/features/admin/hooks/use-users"
import type { DoctorSchedule } from "@/features/admin/api/doctor-schedules-api"

const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY", 
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]

const formatTime = (time: string | Date): string => {
  if (!time) return ""
  
  try {
    const date = new Date(time)
    const hours = date.getUTCHours().toString().padStart(2, "0")
    const minutes = date.getUTCMinutes().toString().padStart(2, "0")
    return `${hours}:${minutes}`
  } catch (error) {
    return String(time).substring(0, 5)
  }
}

const formatDisplayTime = (time: string | Date): string => {
  const timeStr = formatTime(time)
  if (!timeStr) return ""
  
  const [hours, minutes] = timeStr.split(":")
  if (!hours || !minutes) return ""
  
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export default function SchedulePage() {
  const [activeTab, setActiveTab] = React.useState("doctor-schedules")
  const [selectedDoctor, setSelectedDoctor] = React.useState("")
  const [selectedDay, setSelectedDay] = React.useState("")
  const [selectedDate, setSelectedDate] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingSchedule, setEditingSchedule] = React.useState<DoctorSchedule | null>(null)
  
  // Form state
  const [formDoctorId, setFormDoctorId] = React.useState("")
  const [formDayOfWeek, setFormDayOfWeek] = React.useState("")
  const [formStartTime, setFormStartTime] = React.useState("")
  const [formEndTime, setFormEndTime] = React.useState("")
  const [formIsAvailable, setFormIsAvailable] = React.useState(true)

  // Fetch data
  const { data: schedules = [], isLoading: isLoadingSchedules } = useDoctorSchedules({
    doctorId: selectedDoctor || undefined,
    dayOfWeek: selectedDay || undefined,
  })
  
  const { users: doctors = [] } = useUsers({ role: "DOCTOR" })

  const createSchedule = useCreateDoctorSchedule()
  const updateSchedule = useUpdateDoctorSchedule(editingSchedule?.id || "")
  const deleteSchedule = useDeleteDoctorSchedule()

  // Filter schedules
  const filteredSchedules = React.useMemo(() => {
    return schedules.filter((schedule) => {
      if (selectedDoctor && schedule.doctorId !== selectedDoctor) return false
      if (selectedDay && schedule.dayOfWeek !== selectedDay) return false
      if (selectedDate) {
        // Match the day of week with the selected date
        const date = new Date(selectedDate)
        const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
        const dayOfWeek = dayNames[date.getDay()]
        if (schedule.dayOfWeek !== dayOfWeek) return false
      }
      return true
    })
  }, [schedules, selectedDoctor, selectedDay, selectedDate])

  const handleClearFilters = () => {
    setSelectedDoctor("")
    setSelectedDay("")
    setSelectedDate("")
  }

  const handleOpenDialog = (schedule?: DoctorSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule)
      setFormDoctorId(schedule.doctorId)
      setFormDayOfWeek(schedule.dayOfWeek)
      setFormStartTime(formatTime(schedule.startTime))
      setFormEndTime(formatTime(schedule.endTime))
      setFormIsAvailable(schedule.isAvailable)
    } else {
      setEditingSchedule(null)
      setFormDoctorId("")
      setFormDayOfWeek("")
      setFormStartTime("")
      setFormEndTime("")
      setFormIsAvailable(true)
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingSchedule(null)
    setFormDoctorId("")
    setFormDayOfWeek("")
    setFormStartTime("")
    setFormEndTime("")
    setFormIsAvailable(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formDoctorId || !formDayOfWeek || !formStartTime || !formEndTime) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      if (editingSchedule) {
        await updateSchedule.mutateAsync({
          dayOfWeek: formDayOfWeek,
          startTime: formStartTime,
          endTime: formEndTime,
          isAvailable: formIsAvailable,
        })
      } else {
        await createSchedule.mutateAsync({
          doctorId: formDoctorId,
          dayOfWeek: formDayOfWeek,
          startTime: formStartTime,
          endTime: formEndTime,
          isAvailable: formIsAvailable,
        })
      }
      handleCloseDialog()
    } catch (error) {
      // Error already handled by mutation hooks
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return

    try {
      await deleteSchedule.mutateAsync(id)
    } catch (error) {
      // Error already handled by mutation hook
    }
  }

  const availableCount = filteredSchedules.filter(s => s.isAvailable).length

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
                  <Button onClick={() => handleOpenDialog()}>
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
                          <Select value={selectedDoctor} onValueChange={(value) => setSelectedDoctor(value || "")}>
                            <SelectTrigger>
                              {selectedDoctor ? (
                                <span>{doctors.find((d: any) => d.id === selectedDoctor)?.name || "All Doctors"}</span>
                              ) : (
                                <span className="text-muted-foreground">Doctor</span>
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All Doctors</SelectItem>
                              {doctors.map((doctor: any) => (
                                <SelectItem key={doctor.id} value={doctor.id}>
                                  {doctor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={selectedDay} onValueChange={(value) => setSelectedDay(value || "")}>
                            <SelectTrigger>
                              {selectedDay ? (
                                <SelectValue />
                              ) : (
                                <span className="text-muted-foreground">Day of Week</span>
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All Days</SelectItem>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day} value={day}>
                                  {day.charAt(0) + day.slice(1).toLowerCase()}
                                </SelectItem>
                              ))}
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
                              Showing {filteredSchedules.length} schedules ({availableCount} available)
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        {isLoadingSchedules ? (
                          <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : filteredSchedules.length === 0 ? (
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
                                <TableHead>SPECIALIZATION</TableHead>
                                <TableHead>DAY</TableHead>
                                <TableHead>TIME</TableHead>
                                <TableHead>STATUS</TableHead>
                                <TableHead className="text-right">ACTIONS</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredSchedules.map((schedule) => (
                                <TableRow key={schedule.id}>
                                  <TableCell className="font-medium">{schedule.doctorName}</TableCell>
                                  <TableCell>
                                    <span className="text-sm text-muted-foreground">
                                      {schedule.specialization || "N/A"}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    {schedule.dayOfWeek.charAt(0) + schedule.dayOfWeek.slice(1).toLowerCase()}
                                  </TableCell>
                                  <TableCell>
                                    {formatDisplayTime(schedule.startTime)} - {formatDisplayTime(schedule.endTime)}
                                  </TableCell>
                                  <TableCell>
                                    {schedule.isAvailable ? (
                                      <Badge variant="default" className="bg-green-500">Available</Badge>
                                    ) : (
                                      <Badge variant="secondary">Unavailable</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleOpenDialog(schedule)}
                                      >
                                        <IconEdit className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleDelete(schedule.id)}
                                      >
                                        <IconTrash className="h-4 w-4" />
                                      </Button>
                                    </div>
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

      {/* Add/Edit Schedule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? "Edit Schedule" : "Add Schedule"}
              </DialogTitle>
              <DialogDescription>
                {editingSchedule 
                  ? "Update the doctor's schedule details."
                  : "Create a new schedule for a doctor."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Doctor Selection */}
              <div className="grid gap-2">
                <Label htmlFor="doctor">
                  Doctor <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formDoctorId}
                  onValueChange={(value) => setFormDoctorId(value || "")}
                  disabled={!!editingSchedule}
                >
                  <SelectTrigger id="doctor">
                    {formDoctorId ? (
                      <span>{doctors.find((d: any) => d.id === formDoctorId)?.name || formDoctorId}</span>
                    ) : (
                      <span className="text-muted-foreground">Select doctor</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor: any) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingSchedule && (
                  <p className="text-xs text-muted-foreground">
                    Doctor cannot be changed after creation
                  </p>
                )}
              </div>

              {/* Day of Week */}
              <div className="grid gap-2">
                <Label htmlFor="dayOfWeek">
                  Day of Week <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formDayOfWeek}
                  onValueChange={(value) => setFormDayOfWeek(value || "")}
                >
                  <SelectTrigger id="dayOfWeek">
                    {formDayOfWeek ? (
                      <SelectValue />
                    ) : (
                      <span className="text-muted-foreground">Select day</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Time */}
              <div className="grid gap-2">
                <Label htmlFor="startTime">
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  required
                />
              </div>

              {/* End Time */}
              <div className="grid gap-2">
                <Label htmlFor="endTime">
                  End Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  required
                />
              </div>

              {/* Availability Status */}
              <div className="flex items-center space-x-2">
                <input
                  id="isAvailable"
                  type="checkbox"
                  checked={formIsAvailable}
                  onChange={(e) => setFormIsAvailable(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isAvailable" className="font-normal cursor-pointer">
                  Mark as available
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSchedule.isPending || updateSchedule.isPending}
              >
                {(createSchedule.isPending || updateSchedule.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingSchedule ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>{editingSchedule ? "Update" : "Create"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
