"use client"

import { useState, useEffect, useCallback } from "react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Checkbox } from "@/core/components/ui/checkbox"
import { useOrganizationSettings, useUpdateOrganizationSettings } from "@/features/admin/hooks/use-organization-settings"
import type { OrganizationSettings } from "@/features/admin/api/organization-settings-api"
import { authApi } from "@/features/auth/api/auth-api"
import type { User } from "@/services/api/types"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const DAYS_OF_WEEK = [
  { id: 'MONDAY', label: 'Monday' },
  { id: 'TUESDAY', label: 'Tuesday' },
  { id: 'WEDNESDAY', label: 'Wednesday' },
  { id: 'THURSDAY', label: 'Thursday' },
  { id: 'FRIDAY', label: 'Friday' },
  { id: 'SATURDAY', label: 'Saturday' },
  { id: 'SUNDAY', label: 'Sunday' },
]

export default function SystemSettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const organizationId = user?.organizationId as string | undefined

  // Load user profile on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await authApi.getProfile()
        if (res.success && res.data) {
          setUser(res.data as User)
        } else {
          toast.error(res.message || "Failed to load user profile")
        }
      } catch (error) {
        console.error(error)
        toast.error("Failed to load user profile")
      } finally {
        setLoadingUser(false)
      }
    }
    loadUser()
  }, [])

  const { data: settings, isLoading, error } = useOrganizationSettings(organizationId)
  const updateSettings = useUpdateOrganizationSettings(organizationId)

  // Form state
  const [clinicStartTime, setClinicStartTime] = useState("08:00")
  const [clinicEndTime, setClinicEndTime] = useState("17:00")
  const [breakStartTime, setBreakStartTime] = useState("")
  const [breakEndTime, setBreakEndTime] = useState("")
  const [appointmentSlotDuration, setAppointmentSlotDuration] = useState(30)
  const [maxAppointmentsPerSlot, setMaxAppointmentsPerSlot] = useState(1)
  const [bookingWindowDays, setBookingWindowDays] = useState(30)
  const [minAdvanceBookingHours, setMinAdvanceBookingHours] = useState(2)
  const [workingDays, setWorkingDays] = useState<string[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'])

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      setClinicStartTime(settings.clinicStartTime.substring(0, 5)) // HH:MM
      setClinicEndTime(settings.clinicEndTime.substring(0, 5))
      setBreakStartTime(settings.breakStartTime ? settings.breakStartTime.substring(0, 5) : "")
      setBreakEndTime(settings.breakEndTime ? settings.breakEndTime.substring(0, 5) : "")
      setAppointmentSlotDuration(settings.appointmentSlotDuration)
      setMaxAppointmentsPerSlot(settings.maxAppointmentsPerSlot)
      setBookingWindowDays(settings.bookingWindowDays)
      setMinAdvanceBookingHours(settings.minAdvanceBookingHours)
      setWorkingDays(settings.workingDays)
    }
  }, [settings])

  const handleToggleDay = (dayId: string) => {
    setWorkingDays(prev => 
      prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    )
  }

  const handleSave = async () => {
    if (!organizationId) {
      toast.error("Organization ID not found")
      return
    }

    // Validate times
    if (clinicStartTime >= clinicEndTime) {
      toast.error("Clinic end time must be after start time")
      return
    }

    if (breakStartTime && breakEndTime && breakStartTime >= breakEndTime) {
      toast.error("Break end time must be after break start time")
      return
    }

    if (workingDays.length === 0) {
      toast.error("Please select at least one working day")
      return
    }

    await updateSettings.mutateAsync({
      clinicStartTime: clinicStartTime + ":00",
      clinicEndTime: clinicEndTime + ":00",
      breakStartTime: breakStartTime ? breakStartTime + ":00" : null,
      breakEndTime: breakEndTime ? breakEndTime + ":00" : null,
      appointmentSlotDuration,
      maxAppointmentsPerSlot,
      bookingWindowDays,
      minAdvanceBookingHours,
      workingDays,
    })
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
          title="System Settings" 
          description="Configure system-wide settings"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {loadingUser || isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : error ? (
                  <Card>
                    <CardContent className="py-6">
                      <p className="text-destructive">Failed to load settings. Please try again.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {/* Clinic Hours */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Clinic Hours</CardTitle>
                        <CardDescription>
                          Configure clinic operating hours
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="start-time">Opening Time</Label>
                            <Input 
                              id="start-time" 
                              type="time" 
                              value={clinicStartTime}
                              onChange={(e) => setClinicStartTime(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="end-time">Closing Time</Label>
                            <Input 
                              id="end-time" 
                              type="time" 
                              value={clinicEndTime}
                              onChange={(e) => setClinicEndTime(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="break-start">Break Start (Optional)</Label>
                            <Input 
                              id="break-start" 
                              type="time" 
                              value={breakStartTime}
                              onChange={(e) => setBreakStartTime(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="break-end">Break End (Optional)</Label>
                            <Input 
                              id="break-end" 
                              type="time" 
                              value={breakEndTime}
                              onChange={(e) => setBreakEndTime(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Working Days</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <div key={day.id} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={day.id}
                                  checked={workingDays.includes(day.id)}
                                  onCheckedChange={() => handleToggleDay(day.id)}
                                />
                                <Label htmlFor={day.id} className="font-normal cursor-pointer">
                                  {day.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Appointment Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Appointment Settings</CardTitle>
                        <CardDescription>
                          Configure appointment slot settings
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="slot-duration">Slot Duration (minutes)</Label>
                            <Input 
                              id="slot-duration" 
                              type="number" 
                              min="15"
                              step="15"
                              value={appointmentSlotDuration}
                              onChange={(e) => setAppointmentSlotDuration(Number(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="max-per-slot">Max Appointments per Slot</Label>
                            <Input 
                              id="max-per-slot" 
                              type="number" 
                              min="1"
                              value={maxAppointmentsPerSlot}
                              onChange={(e) => setMaxAppointmentsPerSlot(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="booking-window">Booking Window (days ahead)</Label>
                            <Input 
                              id="booking-window" 
                              type="number" 
                              min="1"
                              value={bookingWindowDays}
                              onChange={(e) => setBookingWindowDays(Number(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="advance-hours">Min Advance Booking (hours)</Label>
                            <Input 
                              id="advance-hours" 
                              type="number" 
                              min="0"
                              value={minAdvanceBookingHours}
                              onChange={(e) => setMinAdvanceBookingHours(Number(e.target.value))}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSave}
                        disabled={updateSettings.isPending}
                      >
                        {updateSettings.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Settings"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

