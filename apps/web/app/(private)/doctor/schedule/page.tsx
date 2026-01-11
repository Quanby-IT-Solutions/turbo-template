"use client"

import * as React from "react"
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Badge } from "@/core/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table"

import { appointmentsApi } from "@/features/appointments/api/appointments-api"
import type { AppointmentRequest, RescheduleRequest } from "@/services/api/types"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import { Checkbox } from "@/core/components/ui/checkbox"

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric'
  })
}

const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

const formatDateTime = (dateString: string, timeString: string) => {
  return `${formatDate(dateString)}, ${formatTime(timeString)}`
}

const getMinDate = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

// Helper function to get patient full name from firstName, middleName, lastName
const getPatientFullName = (patientInfo?: { firstName?: string; middleName?: string | null; lastName?: string; fullName?: string }): string => {
  if (!patientInfo) return ''
  
  // Use fullName if available (for backward compatibility)
  if (patientInfo.fullName) return patientInfo.fullName
  
  // Construct from firstName, middleName, lastName
  if (patientInfo.firstName && patientInfo.lastName) {
    const parts = [patientInfo.firstName, patientInfo.middleName, patientInfo.lastName].filter(Boolean)
    return parts.join(' ')
  }
  
  return ''
}

interface DayAvailability {
  dayOfWeek: string
  isAvailable: boolean
  startTime: string
  endTime: string
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = React.useState(false)
  const [weeklyAvailability, setWeeklyAvailability] = React.useState<DayAvailability[]>([])
  const [isLoadingAvailability, setIsLoadingAvailability] = React.useState(false)
  const [isSavingAvailability, setIsSavingAvailability] = React.useState(false)
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = React.useState(false)
  const [rescheduleAppointment, setRescheduleAppointment] = React.useState<AppointmentRequest | null>(null)
  const [rescheduleDate, setRescheduleDate] = React.useState("")
  const [rescheduleTime, setRescheduleTime] = React.useState("")
  const [rescheduleReason, setRescheduleReason] = React.useState("")
  const [isSubmittingReschedule, setIsSubmittingReschedule] = React.useState(false)
  const [rescheduleAvailableTimes, setRescheduleAvailableTimes] = React.useState<string[]>([])
  const [rescheduleWeeklyAvailability, setRescheduleWeeklyAvailability] = React.useState<DayAvailability[]>([])
  const [isLoadingRescheduleTimeSlots, setIsLoadingRescheduleTimeSlots] = React.useState(false)
  const [rescheduleTimeSlotsError, setRescheduleTimeSlotsError] = React.useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = React.useState<AppointmentRequest | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false)
  const [filterStatus, setFilterStatus] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const isMountedRef = React.useRef(true)

  React.useEffect(() => {
    isMountedRef.current = true
    loadAppointments()
    
    return () => {
      isMountedRef.current = false
    }
  }, [])

  React.useEffect(() => {
    if (isAvailabilityDialogOpen) {
      loadWeeklyAvailability()
    }
    
    return () => {
      // Cleanup for availability loading
    }
  }, [isAvailabilityDialogOpen])

  const loadAppointments = async () => {
    if (!isMountedRef.current) return
    
    try {
      setIsLoading(true)
      const response = await appointmentsApi.getMyAppointments()
      
      if (!isMountedRef.current) return
      
      console.log('Appointments response:', response)
      if (response?.success && Array.isArray(response.data)) {
        console.log('Loaded appointments:', response.data)
        setAppointments(response.data)
      } else {
        console.error('Failed to load appointments:', response)
        toast.error(response?.message || 'Failed to load appointments')
        setAppointments([])
      }
    } catch (error) {
      if (!isMountedRef.current) return
      
      console.error('Error loading appointments:', error)
      toast.error('An error occurred while loading appointments')
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const handleAccept = async (appointmentId: string) => {
    try {
      const response = await appointmentsApi.updateAppointmentStatus(appointmentId, 'CONFIRMED')
      if (response.success) {
        toast.success('Appointment confirmed successfully')
        loadAppointments()
      } else {
        toast.error(response.message || 'Failed to accept appointment')
      }
    } catch (error) {
      toast.error('An error occurred while accepting the appointment')
      console.error('Error accepting appointment:', error)
    }
  }

  const handleReject = async (appointmentId: string) => {
    const reason = prompt('Please provide a reason for rejecting this appointment (optional):')
    try {
      const response = await appointmentsApi.updateAppointmentStatus(appointmentId, 'REJECTED', reason || undefined)
      if (response.success) {
        toast.success('Appointment rejected')
        loadAppointments()
      } else {
        toast.error(response.message || 'Failed to reject appointment')
      }
    } catch (error) {
      toast.error('An error occurred while rejecting the appointment')
      console.error('Error rejecting appointment:', error)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return
    }
    try {
      const response = await appointmentsApi.cancelAppointment(appointmentId, 'Cancelled by doctor')
      if (response.success) {
        toast.success('Appointment cancelled successfully')
        loadAppointments()
      } else {
        toast.error(response.message || 'Failed to cancel appointment')
      }
    } catch (error) {
      toast.error('An error occurred while cancelling the appointment')
      console.error('Error cancelling appointment:', error)
    }
  }

  const handleApproveReschedule = async (rescheduleId: string) => {
    if (!window.confirm('Are you sure you want to approve this reschedule request? The appointment date and time will be updated.')) {
      return
    }

    try {
      const response = await appointmentsApi.updateRescheduleStatus(rescheduleId, 'APPROVED')
      if (response.success) {
        toast.success('Reschedule request approved successfully')
        loadAppointments()
      } else {
        toast.error(response.message || 'Failed to approve reschedule request')
      }
    } catch (error) {
      toast.error('An error occurred while approving the reschedule request')
      console.error('Error approving reschedule:', error)
    }
  }

  const handleRejectReschedule = async (rescheduleId: string) => {
    if (!window.confirm('Are you sure you want to reject this reschedule request?')) {
      return
    }

    try {
      const response = await appointmentsApi.updateRescheduleStatus(rescheduleId, 'REJECTED')
      if (response.success) {
        toast.success('Reschedule request rejected')
        loadAppointments()
      } else {
        toast.error(response.message || 'Failed to reject reschedule request')
      }
    } catch (error) {
      toast.error('An error occurred while rejecting the reschedule request')
      console.error('Error rejecting reschedule:', error)
    }
  }

  const openRescheduleDialog = async (appointment: AppointmentRequest) => {
    // Check if there's already a pending reschedule request
    const hasPendingReschedule = appointment.rescheduleRequests?.some((req: RescheduleRequest) => req.status === 'PENDING')
    if (hasPendingReschedule) {
      toast.error('There is already a pending reschedule request for this appointment. Please wait for it to be resolved.')
      return
    }
    
    setRescheduleAppointment(appointment)
    setRescheduleDate(appointment.requestedDate.split('T')[0])
    setRescheduleTime(appointment.requestedTime)
    setRescheduleReason(appointment.reason || "")
    setRescheduleAvailableTimes([])
    setRescheduleWeeklyAvailability([])
    setIsRescheduleDialogOpen(true)
    
    // Load weekly availability
    try {
      const response = await appointmentsApi.getMyWeeklyAvailability()
      if (response.success && response.data) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        const availabilityMap = new Map(
          response.data.map((day: {
            id: string | number;
            doctorId: string;
            dayOfWeek: string;
            startTime: Date | string;
            endTime: Date | string;
            isAvailable: boolean;
          }) => {
            const parseTime = (timeValue: Date | string | null | undefined, defaultValue: string): string => {
              if (!timeValue) return defaultValue
              
              try {
                if (typeof timeValue === 'string') {
                  if (timeValue.includes('T')) {
                    const timePart = timeValue.split('T')[1]
                    if (timePart) {
                      const cleanTime = timePart.split('.')[0]?.split('Z')[0] || timePart.split('Z')[0]
                      return cleanTime ? cleanTime.slice(0, 5) : defaultValue
                    }
                  } else if (timeValue.includes(':')) {
                    return timeValue.slice(0, 5)
                  }
                } else if (timeValue instanceof Date || (typeof timeValue === 'object' && 'getTime' in timeValue)) {
                  const date = new Date(timeValue)
                  if (!isNaN(date.getTime())) {
                    return date.toTimeString().slice(0, 5)
                  }
                }
              } catch (error) {
                console.error('Error parsing time:', error, timeValue)
              }
              
              return defaultValue
            }

            const startTime = parseTime(day.startTime, '09:00')
            const endTime = parseTime(day.endTime, '17:00')

            return [
              day.dayOfWeek,
              {
                dayOfWeek: day.dayOfWeek,
                isAvailable: day.isAvailable || false,
                startTime: startTime || '09:00',
                endTime: endTime || '17:00',
              }
            ]
          })
        )

        const fullAvailability: DayAvailability[] = days.map(day => {
          const existing = availabilityMap.get(day)
          if (existing) {
            return existing
          }
          return {
            dayOfWeek: day,
            isAvailable: false,
            startTime: '09:00',
            endTime: '17:00',
          }
        })

        setRescheduleWeeklyAvailability(fullAvailability)
      }
    } catch (error) {
      console.error('Error loading availability for reschedule:', error)
    }
  }

  const handleRescheduleDateChange = async (value: string) => {
    if (!value) {
      setRescheduleDate("")
      setRescheduleAvailableTimes([])
      setRescheduleTime("")
      setRescheduleTimeSlotsError(null)
      return
    }
    const parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) {
      toast.error('Invalid date selected')
      return
    }
    const dayOfWeek = parsedDate.toLocaleDateString('en-US', { weekday: 'long' })
    const dayAvailability = rescheduleWeeklyAvailability.find((day) => day.dayOfWeek === dayOfWeek)
    if (!dayAvailability || !dayAvailability.isAvailable) {
      toast.error('You are not available on this day. Please update your weekly availability first.')
      setRescheduleDate("")
      setRescheduleAvailableTimes([])
      setRescheduleTime("")
      setRescheduleTimeSlotsError('not-available')
      return
    }
    setRescheduleDate(value)
    setIsLoadingRescheduleTimeSlots(true)
    setRescheduleTimeSlotsError(null)
    
    try {
      // Generate time slots
      const times: string[] = []
      const startTimeStr = dayAvailability.startTime || '09:00'
      const endTimeStr = dayAvailability.endTime || '17:00'
      
      const [startHour, startMin] = startTimeStr.split(':').map(Number)
      const [endHour, endMin] = endTimeStr.split(':').map(Number)
      
      if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
        console.error('Invalid time format:', { startTimeStr, endTimeStr })
        setRescheduleAvailableTimes([])
        setRescheduleTimeSlotsError('invalid-time')
        return
      }
      
      let currentHour = startHour
      let currentMin = startMin
      
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        times.push(`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`)
        currentMin += 30
        if (currentMin >= 60) {
          currentMin = 0
          currentHour += 1
        }
      }
      
      // Filter out times that conflict with existing appointments (excluding the current appointment being rescheduled)
      const selectedDateStr = value
      const conflictingTimes = appointments
        .filter(apt => {
          const aptDate = new Date(apt.requestedDate)
          const aptDateStr = aptDate.toISOString().split('T')[0]
          return aptDateStr === selectedDateStr &&
                 apt.id !== rescheduleAppointment?.id &&
                 (apt.status === 'CONFIRMED' || apt.status === 'PENDING' || apt.status === 'RESCHEDULED')
        })
        .map(apt => apt.requestedTime)
      
      const availableTimes = times.filter(time => !conflictingTimes.includes(time))
      setRescheduleAvailableTimes(availableTimes)
      setRescheduleTimeSlotsError(availableTimes.length === 0 && times.length > 0 ? 'all-booked' : availableTimes.length === 0 ? 'no-slots' : null)
      
      // Reset time if it's not in the new available times
      if (rescheduleTime && !availableTimes.includes(rescheduleTime)) {
        setRescheduleTime("")
      }
      
      if (conflictingTimes.length > 0) {
        toast.info(`${conflictingTimes.length} time slot(s) are already booked and have been filtered out`)
      }
    } finally {
      setIsLoadingRescheduleTimeSlots(false)
    }
  }

  const handleRescheduleSubmit = async () => {
    if (!rescheduleAppointment) return
    if (!rescheduleDate || !rescheduleTime || !rescheduleReason.trim()) {
      toast.error('Please complete all reschedule fields')
      return
    }
    
    // Validate that selected time is in available times
    if (rescheduleAvailableTimes.length > 0 && !rescheduleAvailableTimes.includes(rescheduleTime)) {
      toast.error('Please select a valid time slot from the available times')
      return
    }
    
    // Check for conflicts
    const selectedDateStr = rescheduleDate
    const conflictingAppointment = appointments.find(apt => {
      const aptDate = new Date(apt.requestedDate)
      const aptDateStr = aptDate.toISOString().split('T')[0]
      return aptDateStr === selectedDateStr &&
             apt.requestedTime === rescheduleTime &&
             apt.id !== rescheduleAppointment.id &&
             (apt.status === 'CONFIRMED' || apt.status === 'PENDING' || apt.status === 'RESCHEDULED')
    })
    
    if (conflictingAppointment) {
      toast.error('This time slot conflicts with an existing appointment. Please select another time.')
      return
    }
    
    if (!window.confirm('Are you sure you want to request a reschedule for this appointment?')) {
      return
    }
    try {
      setIsSubmittingReschedule(true)
      const response = await appointmentsApi.requestReschedule(rescheduleAppointment.id, {
        newDate: new Date(rescheduleDate).toISOString(),
        newTime: rescheduleTime,
        reason: rescheduleReason.trim(),
      })
      if (response.success) {
        toast.success('Reschedule request sent successfully')
        setIsRescheduleDialogOpen(false)
        setRescheduleAppointment(null)
        setRescheduleDate("")
        setRescheduleTime("")
        setRescheduleReason("")
        setRescheduleAvailableTimes([])
        setRescheduleWeeklyAvailability([])
        loadAppointments()
      } else {
        toast.error(response.message || 'Failed to request reschedule')
      }
    } catch (error) {
      console.error('Error requesting reschedule:', error)
      toast.error('An error occurred while requesting reschedule')
    } finally {
      setIsSubmittingReschedule(false)
    }
  }

  const loadWeeklyAvailability = async () => {
    if (!isMountedRef.current) return
    
    try {
      setIsLoadingAvailability(true)
      const response = await appointmentsApi.getMyWeeklyAvailability()
      
      if (!isMountedRef.current) return
      
      if (response.success && response.data) {
        console.log('Availability response:', response.data)
        // Initialize with all days if not present
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        const availabilityMap = new Map(
          response.data.map((day: {
            id: string | number;
            doctorId: string;
            dayOfWeek: string;
            startTime: Date | string;
            endTime: Date | string;
            isAvailable: boolean;
          }) => {
            // Helper function to parse time
            const parseTime = (timeValue: Date | string | null | undefined, defaultValue: string): string => {
              if (!timeValue) return defaultValue
              
              try {
                if (typeof timeValue === 'string') {
                  // Handle ISO string format (e.g., "1970-01-01T09:00:00.000Z" or "09:00:00")
                  if (timeValue.includes('T')) {
                    // ISO datetime string - extract time portion
                    const timePart = timeValue.split('T')[1]
                    if (timePart) {
                      // Remove milliseconds and timezone
                      const cleanTime = timePart.split('.')[0]?.split('Z')[0] || timePart.split('Z')[0]
                      return cleanTime ? cleanTime.slice(0, 5) : defaultValue
                    }
                  } else if (timeValue.includes(':')) {
                    // Just time string (HH:MM:SS or HH:MM)
                    return timeValue.slice(0, 5)
                  }
                } else if (timeValue instanceof Date || (typeof timeValue === 'object' && 'getTime' in timeValue)) {
                  // Date object
                  const date = new Date(timeValue)
                  if (!isNaN(date.getTime())) {
                    return date.toTimeString().slice(0, 5)
                  }
                }
              } catch (error) {
                console.error('Error parsing time:', error, timeValue)
              }
              
              return defaultValue
            }

            const startTime = parseTime(day.startTime, '09:00')
            const endTime = parseTime(day.endTime, '17:00')

            // Always ensure times are set, even if day is not available (for when user enables it)
            return [
              day.dayOfWeek,
              {
                dayOfWeek: day.dayOfWeek,
                isAvailable: day.isAvailable || false,
                startTime: startTime || '09:00',
                endTime: endTime || '17:00',
              }
            ]
          })
        )

        // Ensure all days are present
        const fullAvailability: DayAvailability[] = days.map(day => {
          const existing = availabilityMap.get(day)
          if (existing) {
            return existing
          }
          // For new days, check if they should be available by default
          // If the day exists in response but wasn't in the map, it means it's not available
          // Otherwise, it's a completely new day
          return {
            dayOfWeek: day,
            isAvailable: false,
            startTime: '09:00',
            endTime: '17:00',
          }
        })

        if (isMountedRef.current) {
          setWeeklyAvailability(fullAvailability)
        }
      } else {
        if (isMountedRef.current) {
          toast.error(response.message || 'Failed to load availability')
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return
      
      toast.error('An error occurred while loading availability')
      console.error('Error loading availability:', error)
    } finally {
      if (isMountedRef.current) {
        setIsLoadingAvailability(false)
      }
    }
  }

  const handleAvailabilityChange = (dayOfWeek: string, field: 'isAvailable' | 'startTime' | 'endTime', value: boolean | string) => {
    setWeeklyAvailability(prev => 
      prev.map(day => {
        if (day.dayOfWeek === dayOfWeek) {
          // If enabling availability and times are not set, use defaults
          if (field === 'isAvailable' && value === true) {
            return {
              ...day,
              isAvailable: true,
              startTime: day.startTime || '09:00',
              endTime: day.endTime || '17:00',
            }
          }
          return { ...day, [field]: value }
        }
        return day
      })
    )
  }

  // Cleanup handler for reschedule dialog
  const handleRescheduleDialogClose = (open: boolean) => {
    setIsRescheduleDialogOpen(open)
    if (!open) {
      // Reset reschedule form state when dialog closes
      setRescheduleAppointment(null)
      setRescheduleDate("")
      setRescheduleTime("")
      setRescheduleReason("")
      setRescheduleAvailableTimes([])
      setRescheduleWeeklyAvailability([])
      setRescheduleTimeSlotsError(null)
    }
  }

  const handleSaveAvailability = async () => {
    try {
      setIsSavingAvailability(true)
      const daysToUpdate = weeklyAvailability.map(day => {
        // Create ISO datetime strings for start and end times
        // Use a base date (1970-01-01) and append the time
        const startTimeISO = day.isAvailable && day.startTime 
          ? `1970-01-01T${day.startTime}:00Z`
          : undefined
        const endTimeISO = day.isAvailable && day.endTime
          ? `1970-01-01T${day.endTime}:00Z`
          : undefined

        return {
          dayOfWeek: day.dayOfWeek,
          isAvailable: day.isAvailable,
          startTime: startTimeISO,
          endTime: endTimeISO,
        }
      })

      const response = await appointmentsApi.updateMyWeeklyAvailability(daysToUpdate)
      if (response.success) {
        toast.success('Weekly availability updated successfully')
        setIsAvailabilityDialogOpen(false)
      } else {
        // Show more detailed error message if available
        const errorMessage = response.message || 'Failed to update availability'
        const errorData = response.data as { conflicts?: string[] } | undefined
        if (errorData?.conflicts && Array.isArray(errorData.conflicts)) {
          toast.error(`${errorMessage}: ${errorData.conflicts.join(', ')}`)
        } else {
          toast.error(errorMessage)
        }
      }
    } catch (error) {
      toast.error('An error occurred while saving availability')
      console.error('Error saving availability:', error)
    } finally {
      setIsSavingAvailability(false)
    }
  }

  const month = currentDate.getMonth()
  const year = currentDate.getFullYear()
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" })

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Adjust to Monday = 0 (Monday is the first day of the week)
  const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

  // Get days from previous month to fill the first week
  const prevMonth = new Date(year, month, 0)
  const daysInPrevMonth = prevMonth.getDate()
  const days: Array<{ day: number; isCurrentMonth: boolean; appointments?: AppointmentRequest[] }> = []

  // Add previous month's days
  for (let i = adjustedStartingDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, isCurrentMonth: false })
  }

  // Add current month's days
  for (let i = 1; i <= daysInMonth; i++) {
    const dayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.requestedDate)
      return aptDate.getDate() === i && 
             aptDate.getMonth() === month && 
             aptDate.getFullYear() === year &&
             (apt.status === 'CONFIRMED' || apt.status === 'PENDING' || apt.status === 'RESCHEDULED')
    })
    days.push({ day: i, isCurrentMonth: true, appointments: dayAppointments })
  }

  // Fill remaining days to complete the grid (next month)
  const totalCells = Math.ceil(days.length / 7) * 7
  for (let i = days.length; i < totalCells; i++) {
    days.push({ day: i - days.length + 1, isCurrentMonth: false })
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(new Date(year, month + (direction === "next" ? 1 : -1), 1))
  }

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

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
          title="My Schedule" 
          description="Manage your appointments and schedule"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">All Appointments</h2>
                  <Button onClick={() => setIsAvailabilityDialogOpen(true)}>
                    <IconCalendar className="h-4 w-4 mr-2" />
                    Manage Weekly Availability
                  </Button>
                </div>

                {/* All Appointments */}
                <Card className="mb-6">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-4">
                        <CardTitle>All Appointments</CardTitle>
                        <div className="flex items-center gap-3">
                          <Input
                            placeholder="Search by patient name or reason..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64"
                          />
                          <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                              <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
                              <SelectItem value="REJECTED">Rejected</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => {
                      // Filter appointments
                      const filteredAppointments = appointments.filter((appointment) => {
                        // Status filter
                        if (filterStatus !== "all" && appointment.status !== filterStatus) {
                          return false
                        }
                        
                        // Search filter
                        if (searchQuery.trim()) {
                          const query = searchQuery.toLowerCase()
                          const patientName = getPatientFullName(appointment.patient?.patientInfo)?.toLowerCase() || appointment.patient?.email?.toLowerCase() || ""
                          const reason = appointment.reason?.toLowerCase() || ""
                          if (!patientName.includes(query) && !reason.includes(query)) {
                            return false
                          }
                        }
                        
                        return true
                      })

                      return (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Patient</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Date & Time</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                  Loading...
                                </TableCell>
                              </TableRow>
                            ) : filteredAppointments.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                  {appointments.length === 0 
                                    ? "No appointments found" 
                                    : "No appointments match your filters"}
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredAppointments.map((appointment) => {
                            const pendingReschedules = appointment.rescheduleRequests?.filter((req: RescheduleRequest) => req.status === 'PENDING') || []
                            return (
                              <React.Fragment key={appointment.id}>
                                <TableRow 
                                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                                  onClick={() => {
                                    setSelectedAppointment(appointment)
                                    setIsDetailsDialogOpen(true)
                                  }}
                                >
                                  <TableCell className="font-medium">
                                    {getPatientFullName(appointment.patient?.patientInfo) || appointment.patient?.email || 'Unknown Patient'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div>{appointment.reason}</div>
                                      {pendingReschedules.length > 0 && (
                                        <div className="text-xs text-orange-600 font-medium">
                                          {pendingReschedules.length} pending reschedule request{pendingReschedules.length > 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>{formatDateTime(appointment.requestedDate, appointment.requestedTime)}</TableCell>
                              <TableCell>
                                    <Badge 
                                      variant={
                                        appointment.status === 'CONFIRMED' ? 'default' :
                                        appointment.status === 'PENDING' ? 'outline' :
                                        appointment.status === 'REJECTED' ? 'destructive' :
                                        'secondary'
                                      }
                                      className={
                                        appointment.status === 'PENDING' 
                                          ? 'bg-orange-500/10 text-orange-700 border-orange-500/20'
                                          : appointment.status === 'CONFIRMED'
                                          ? 'bg-green-500/10 text-green-700 border-green-500/20'
                                          : ''
                                      }
                                    >
                                      {appointment.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                    {appointment.status === 'PENDING' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleAccept(appointment.id)
                                          }}
                                    className="bg-green-500 hover:bg-green-600 text-white border-green-500"
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleReject(appointment.id)
                                          }}
                                    className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                                  >
                                    Reject
                                  </Button>
                        </div>
                                    ) : appointment.status === 'CONFIRMED' ? (() => {
                                      const hasPendingReschedule = appointment.rescheduleRequests?.some((req: RescheduleRequest) => req.status === 'PENDING')
                                      return (
                                        <div className="flex items-center justify-end gap-2 flex-wrap">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleCancelAppointment(appointment.id)
                                            }}
                                            className="text-destructive hover:text-destructive"
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openRescheduleDialog(appointment)
                                            }}
                                            disabled={hasPendingReschedule}
                                            title={hasPendingReschedule ? 'There is already a pending reschedule request for this appointment' : ''}
                                          >
                                            Request Reschedule
                                          </Button>
                                        </div>
                                      )
                                    })() : (
                                      <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                                {pendingReschedules.length > 0 && (
                                  <TableRow>
                                    <TableCell colSpan={5} className="bg-orange-50">
                                      <div className="space-y-2 py-2">
                                        {pendingReschedules.map((req: RescheduleRequest) => {
                                          // Only show approve/reject buttons if the request was NOT made by the doctor
                                          // (i.e., if patient requested it, doctor can approve/reject)
                                          const canApproveReject = req.requestedByRole !== 'DOCTOR'
                                          return (
                                            <div key={req.id} className="rounded-lg border border-orange-200 bg-white p-3">
                                              <p className="text-sm font-medium text-orange-900">
                                                {req.requestedByRole === 'DOCTOR' 
                                                  ? 'Your Reschedule Request Pending' 
                                                  : 'Reschedule Request Pending'}
                                              </p>
                                              <p className="text-xs text-orange-700 mt-1">
                                                Requested: {formatDate(req.newDate)} at {formatTime(req.newTime)}
                                              </p>
                                              {req.reason && (
                                                <p className="text-xs text-orange-700 mt-1">
                                                  <strong>Reason:</strong> {req.reason}
                                                </p>
                                              )}
                                              {canApproveReject && (
                                                <div className="mt-2 flex gap-2">
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      handleApproveReschedule(req.id)
                                                    }}
                                                    className="bg-green-500 hover:bg-green-600 text-white border-green-500 text-xs"
                                                  >
                                                    Approve
                                                  </Button>
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      handleRejectReschedule(req.id)
                                                    }}
                                                    className="bg-red-500 hover:bg-red-600 text-white border-red-500 text-xs"
                                                  >
                                                    Reject
                                                  </Button>
                                                </div>
                                              )}
                                              {!canApproveReject && (
                                                <p className="text-xs text-orange-600 mt-2 italic">
                                                  Waiting for patient&apos;s response...
                                                </p>
                                              )}
                                            </div>
                                          )
                                        })}
                        </div>
                              </TableCell>
                            </TableRow>
                                )}
                              </React.Fragment>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                      )
                    })()}
                  </CardContent>
                </Card>

                {/* Calendar */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                      <CardTitle>{monthName}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigateMonth("prev")}
                          className="h-8 w-8"
                        >
                          <IconChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigateMonth("next")}
                          className="h-8 w-8"
                        >
                          <IconChevronRight className="h-4 w-4" />
                        </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                    <div className="grid grid-cols-7 gap-0.5 max-w-2xl mx-auto">
                      {/* Day names */}
                      {dayNames.map((day) => (
                        <div
                          key={day}
                          className="p-1 text-center text-xs font-medium text-muted-foreground"
                        >
                          {day}
                        </div>
                      ))}
                      {/* Calendar days */}
                      {days.map((dayInfo, index) => {
                        const hasAppointments = dayInfo.appointments && dayInfo.appointments.length > 0
                        const confirmedAppointments = dayInfo.appointments?.filter(apt => apt.status === 'CONFIRMED') || []
                        const pendingAppointments = dayInfo.appointments?.filter(apt => apt.status === 'PENDING') || []
                        const rescheduledAppointments = dayInfo.appointments?.filter(apt => apt.status === 'RESCHEDULED') || []
                        
                        // Determine background color based on appointment statuses
                        let dayBgColor = ""
                        if (hasAppointments) {
                          if (rescheduledAppointments.length > 0) {
                            dayBgColor = "bg-purple-50 border-purple-200"
                          } else if (confirmedAppointments.length > 0) {
                            dayBgColor = "bg-green-50 border-green-200"
                          } else if (pendingAppointments.length > 0) {
                            dayBgColor = "bg-orange-50 border-orange-200"
                          }
                        }
                        
                        return (
                        <div
                          key={index}
                          className={`
                              aspect-square p-1 border rounded text-center text-xs flex flex-col items-center justify-center relative
                            ${dayInfo.isCurrentMonth ? "bg-background" : "bg-muted/30 text-muted-foreground"}
                              ${dayBgColor}
                          `}
                        >
                            <span>{dayInfo.day}</span>
                            {hasAppointments && (
                              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1 items-center justify-center">
                                {confirmedAppointments.length > 0 && (
                                  <span 
                                    className="w-2.5 h-2.5 bg-green-500 rounded-full border border-green-600 shadow-sm" 
                                    title={`${confirmedAppointments.length} confirmed appointment(s)`}
                                  ></span>
                                )}
                                {pendingAppointments.length > 0 && (
                                  <span 
                                    className="w-2.5 h-2.5 bg-orange-500 rounded-full border border-orange-600 shadow-sm" 
                                    title={`${pendingAppointments.length} pending appointment(s)`}
                                  ></span>
                                )}
                                {rescheduledAppointments.length > 0 && (
                                  <span 
                                    className="w-2.5 h-2.5 bg-purple-500 rounded-full border border-purple-600 shadow-sm" 
                                    title={`${rescheduledAppointments.length} rescheduled appointment(s)`}
                                  ></span>
                                )}
                              </div>
                            )}
                        </div>
                        )
                      })}
                    </div>
                    {/* Color Legend */}
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span className="text-muted-foreground">Confirmed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                        <span className="text-muted-foreground">Pending</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                        <span className="text-muted-foreground">Rescheduled</span>
                      </div>
                    </div>
                    </CardContent>
                  </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Weekly Availability Dialog */}
      <Dialog open={isAvailabilityDialogOpen} onOpenChange={setIsAvailabilityDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Weekly Availability</DialogTitle>
            <DialogDescription>
              Set your availability for each day of the week. Patients can only book appointments during your available hours.
            </DialogDescription>
          </DialogHeader>

          {isLoadingAvailability ? (
            <div className="py-8 text-center text-muted-foreground">Loading availability...</div>
          ) : (
            <div className="space-y-4 py-4">
              {weeklyAvailability.map((day) => (
                <Card key={day.dayOfWeek}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id={`available-${day.dayOfWeek}`}
                          checked={day.isAvailable}
                          onCheckedChange={(checked) => 
                            handleAvailabilityChange(day.dayOfWeek, 'isAvailable', checked === true)
                          }
                        />
                        <label
                          htmlFor={`available-${day.dayOfWeek}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 min-w-[100px]"
                        >
                          {day.dayOfWeek}
                        </label>
                      </div>

                      {day.isAvailable && (
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <Field>
                            <FieldLabel>Start Time</FieldLabel>
                            <Input
                              type="time"
                              value={day.startTime}
                              onChange={(e) => 
                                handleAvailabilityChange(day.dayOfWeek, 'startTime', e.target.value)
                              }
                            />
                          </Field>
                          <Field>
                            <FieldLabel>End Time</FieldLabel>
                            <Input
                              type="time"
                              value={day.endTime}
                              onChange={(e) => 
                                handleAvailabilityChange(day.dayOfWeek, 'endTime', e.target.value)
                              }
                            />
                          </Field>
                        </div>
                      )}

                      {!day.isAvailable && (
                        <div className="flex-1 text-sm text-muted-foreground pt-2">
                          Not available on this day
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAvailabilityDialogOpen(false)}
              disabled={isSavingAvailability}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAvailability}
              disabled={isSavingAvailability || isLoadingAvailability}
            >
              {isSavingAvailability ? 'Saving...' : 'Save Availability'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={handleRescheduleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Reschedule</DialogTitle>
            <DialogDescription>
              Choose a new date and time for this appointment. The patient will need to confirm the new schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Field>
              <FieldLabel>New Date *</FieldLabel>
              <Input
                type="date"
                value={rescheduleDate}
                min={getMinDate()}
                onChange={(e) => handleRescheduleDateChange(e.target.value)}
              />
              <FieldDescription>Select a date for the rescheduled appointment (tomorrow or later)</FieldDescription>
            </Field>

            {rescheduleDate && (
              <Field>
                <FieldLabel>Select Time *</FieldLabel>
                {isLoadingRescheduleTimeSlots ? (
                  <div className="text-sm text-muted-foreground py-2">
                    Loading available time slots...
                  </div>
                ) : rescheduleAvailableTimes.length > 0 ? (
                  <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {rescheduleAvailableTimes.map((time) => {
                        const [hours, minutes] = time.split(':')
                        const hour = parseInt(hours)
                        const ampm = hour >= 12 ? 'PM' : 'AM'
                        const displayHour = hour % 12 || 12
                        return (
                          <SelectItem key={time} value={time}>
                            {displayHour}:{minutes} {ampm}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground py-2">
                    {rescheduleTimeSlotsError === 'all-booked' 
                      ? 'All time slots for this date are already booked. Please select another date.'
                      : rescheduleTimeSlotsError === 'not-available'
                      ? 'You are not available on this day. Please update your weekly availability first.'
                      : 'No available time slots for this date. Please select another date or update your availability.'}
                  </div>
                )}
                <FieldDescription>
                  {isLoadingRescheduleTimeSlots 
                    ? 'Checking available time slots...'
                    : rescheduleAvailableTimes.length > 0
                    ? 'Available time slots for the selected date (conflicts excluded)'
                    : 'Please select a different date'}
                </FieldDescription>
              </Field>
            )}

            <Field>
              <FieldLabel>Reason *</FieldLabel>
              <Input
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Provide a reason for the reschedule"
              />
              <FieldDescription>Briefly explain why you need to reschedule</FieldDescription>
            </Field>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRescheduleDialogOpen(false)}
              disabled={isSubmittingReschedule}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRescheduleSubmit} 
              disabled={isSubmittingReschedule || !rescheduleDate || !rescheduleTime || !rescheduleReason.trim() || (rescheduleAvailableTimes.length > 0 && !rescheduleAvailableTimes.includes(rescheduleTime))}
            >
              {isSubmittingReschedule ? 'Submitting...' : 'Submit Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              Complete information about the appointment
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-6 py-4">
              {/* Patient Information */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Patient Name</p>
                    <p className="font-medium">
                      {getPatientFullName(selectedAppointment.patient?.patientInfo) || selectedAppointment.patient?.email || 'Unknown Patient'}
                    </p>
                  </div>
                  {selectedAppointment.patient?.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedAppointment.patient.email}</p>
                    </div>
                  )}
                  {selectedAppointment.patient?.patientInfo?.contactNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Number</p>
                      <p className="font-medium">{selectedAppointment.patient.patientInfo.contactNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Appointment Details */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Appointment Details</h3>
                <div className="space-y-4 p-5 bg-muted/50 rounded-lg border">
                  {selectedAppointment.status === 'RESCHEDULED' ? (
                    <>
                      {/* For rescheduled appointments, show both original and rescheduled dates */}
                      {(() => {
                        // Find the approved reschedule request to get original date
                        const approvedReschedule = selectedAppointment.rescheduleRequests?.find(
                          (req: RescheduleRequest) => req.status === 'APPROVED'
                        )
                        const hasOriginalDate = approvedReschedule && approvedReschedule.currentDate && approvedReschedule.currentTime
                        
                        return (
                          <>
                            {hasOriginalDate && approvedReschedule && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original Date & Time</p>
                                <p className="text-base font-semibold text-orange-600">
                                  {formatDate(approvedReschedule.currentDate!)} at {formatTime(approvedReschedule.currentTime!)}
                                </p>
                              </div>
                            )}
                            <div className={`space-y-1 ${hasOriginalDate ? 'pt-3 border-t' : ''}`}>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rescheduled Date & Time</p>
                              <p className="text-base font-semibold text-green-600">
                                {formatDate(selectedAppointment.requestedDate)} at {formatTime(selectedAppointment.requestedTime)}
                              </p>
                            </div>
                          </>
                        )
                      })()}
                    </>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date & Time</p>
                      <p className="text-base font-semibold">
                        {formatDate(selectedAppointment.requestedDate)} at {formatTime(selectedAppointment.requestedTime)}
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-6 pt-3 border-t">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                      <div className="mt-1">
                        <Badge 
                          variant={
                            selectedAppointment.status === 'CONFIRMED' ? 'default' :
                            selectedAppointment.status === 'PENDING' ? 'outline' :
                            selectedAppointment.status === 'REJECTED' ? 'destructive' :
                            'secondary'
                          }
                          className={
                            selectedAppointment.status === 'PENDING' 
                              ? 'bg-orange-500/10 text-orange-700 border-orange-500/20'
                              : selectedAppointment.status === 'CONFIRMED'
                              ? 'bg-green-500/10 text-green-700 border-green-500/20'
                              : ''
                          }
                        >
                          {selectedAppointment.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</p>
                      <p className="text-base font-semibold capitalize">{selectedAppointment.priority.toLowerCase()}</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Requested On</p>
                    <p className="text-base font-semibold">
                      {formatDate(selectedAppointment.createdAt)} at {formatTime(new Date(selectedAppointment.createdAt).toTimeString().slice(0, 5))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason and Notes */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Reason & Notes</h3>
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Reason for Visit</p>
                    <p className="font-medium">{selectedAppointment.reason}</p>
                  </div>
                  {selectedAppointment.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Additional Notes</p>
                      <p className="font-medium">{selectedAppointment.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reschedule Requests */}
              {selectedAppointment.rescheduleRequests && selectedAppointment.rescheduleRequests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Reschedule History</h3>
                  <div className="space-y-2">
                    {selectedAppointment.rescheduleRequests.map((req: RescheduleRequest) => (
                      <div key={req.id} className="p-4 bg-muted/50 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant={
                              req.status === 'APPROVED' ? 'default' :
                              req.status === 'REJECTED' ? 'destructive' :
                              'outline'
                            }
                            className={
                              req.status === 'PENDING' 
                                ? 'bg-orange-500/10 text-orange-700 border-orange-500/20'
                                : req.status === 'APPROVED'
                                ? 'bg-green-500/10 text-green-700 border-green-500/20'
                                : ''
                            }
                          >
                            {req.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(req.createdAt)}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {req.currentDate && req.currentTime && (
                            <div>
                              <p className="text-muted-foreground">From</p>
                              <p className="font-medium">
                                {formatDate(req.currentDate)} at {formatTime(req.currentTime)}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground">To</p>
                            <p className="font-medium">
                              {formatDate(req.newDate)} at {formatTime(req.newTime)}
                            </p>
                          </div>
                        </div>
                        {req.reason && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Reason</p>
                            <p className="text-sm font-medium">{req.reason}</p>
                          </div>
                        )}
                        {req.requestedByRole && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Requested by: {req.requestedByRole === 'DOCTOR' ? 'You' : 'Patient'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedAppointment.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAccept(selectedAppointment.id)
                        setIsDetailsDialogOpen(false)
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white border-green-500"
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReject(selectedAppointment.id)
                        setIsDetailsDialogOpen(false)
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                    >
                      Reject
                    </Button>
                  </div>
                )}
                {selectedAppointment.status === 'CONFIRMED' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCancelAppointment(selectedAppointment.id)
                        setIsDetailsDialogOpen(false)
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      Cancel
                    </Button>
                    {(() => {
                      const hasPendingReschedule = selectedAppointment.rescheduleRequests?.some((req: RescheduleRequest) => req.status === 'PENDING')
                      return (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openRescheduleDialog(selectedAppointment)
                            setIsDetailsDialogOpen(false)
                          }}
                          disabled={hasPendingReschedule}
                          title={hasPendingReschedule ? 'There is already a pending reschedule request for this appointment' : ''}
                        >
                          Request Reschedule
                        </Button>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
