"use client"

import * as React from "react"
import { toast } from "sonner"

import { RoleHeader } from "@/core/components/role-header"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
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
import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { getUser } from "@/services/api/client"
import type {
	AppointmentRequest,
	DoctorAvailability,
	RescheduleRequest,
} from "@/services/api/types"
import { appointmentsApi } from "@/features/appointments/api/appointments-api"

const getStatusBadgeVariant = (status: string) => {
	switch (status) {
		case "CONFIRMED":
			return "default"
		case "PENDING":
			return "outline"
		case "REJECTED":
			return "destructive"
		case "CANCELLED":
			return "secondary"
		case "RESCHEDULED":
			return "secondary"
		default:
			return "outline"
	}
}

const formatDate = (dateString: string) => {
	const date = new Date(dateString)
	return date.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	})
}

const formatTime = (timeString: string) => {
	const [hours, minutes] = timeString.split(":")
	const hour = parseInt(hours)
	const ampm = hour >= 12 ? "PM" : "AM"
	const displayHour = hour % 12 || 12
	return `${displayHour}:${minutes} ${ampm}`
}

export default function SchedulePage() {
	const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([])
	const [isLoading, setIsLoading] = React.useState(true)
	const [doctorAvailability, setDoctorAvailability] = React.useState<DoctorAvailability[]>([])
	const [isBookingOpen, setIsBookingOpen] = React.useState(false)
	const [doctors, setDoctors] = React.useState<
		Array<{ id: string; name: string; specialization: string }>
	>([])
	const [selectedDoctorId, setSelectedDoctorId] = React.useState<string>("")
	const [selectedDate, setSelectedDate] = React.useState<string>("")
	const [selectedTime, setSelectedTime] = React.useState<string>("")
	const [reason, setReason] = React.useState<string>("")
	const [notes, setNotes] = React.useState<string>("")
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [availableTimes, setAvailableTimes] = React.useState<string[]>([])
	const [isLoadingTimeSlots, setIsLoadingTimeSlots] = React.useState(false)
	const [timeSlotsError, setTimeSlotsError] = React.useState<string | null>(null)
	const [filterStatus, setFilterStatus] = React.useState<string>("all")
	const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = React.useState(false)
	const [rescheduleAppointmentId, setRescheduleAppointmentId] = React.useState<string | null>(null)
	const [rescheduleAppointment, setRescheduleAppointment] =
		React.useState<AppointmentRequest | null>(null)
	const [rescheduleDate, setRescheduleDate] = React.useState("")
	const [rescheduleTime, setRescheduleTime] = React.useState("")
	const [rescheduleReason, setRescheduleReason] = React.useState("")
	const [isSubmittingReschedule, setIsSubmittingReschedule] = React.useState(false)
	const [rescheduleAvailableTimes, setRescheduleAvailableTimes] = React.useState<string[]>([])
	const [rescheduleDoctorAvailability, setRescheduleDoctorAvailability] = React.useState<
		DoctorAvailability[]
	>([])
	const [isLoadingRescheduleTimeSlots, setIsLoadingRescheduleTimeSlots] = React.useState(false)
	const [rescheduleTimeSlotsError, setRescheduleTimeSlotsError] = React.useState<string | null>(
		null
	)
	const [selectedAppointment, setSelectedAppointment] = React.useState<AppointmentRequest | null>(
		null
	)
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false)
	const [currentPage, setCurrentPage] = React.useState(1)
	const [itemsPerPage] = React.useState(10)

	const loadAppointments = async () => {
		try {
			setIsLoading(true)
			const response = await appointmentsApi.getMyAppointments()
			console.log("Appointments response:", response)

			// Handle paginated response structure
			if (response?.success && response.data) {
				// Check if it's paginated (has items property)
				if (response.data.items && Array.isArray(response.data.items)) {
					console.log("Loaded appointments:", response.data.items)
					setAppointments(response.data.items)
				}
				// Fallback: if it's a direct array
				else if (Array.isArray(response.data)) {
					console.log("Loaded appointments:", response.data)
					setAppointments(response.data)
				} else {
					console.error("Unexpected response format:", response)
					toast.error("Unexpected response format")
					setAppointments([])
				}
			} else {
				console.error("Failed to load appointments:", response)
				toast.error(response?.message || "Failed to load appointments")
				setAppointments([])
			}
		} catch (error) {
			console.error("Error loading appointments:", error)
			toast.error("An error occurred while loading appointments")
		} finally {
			setIsLoading(false)
		}
	}

	const loadDoctors = async () => {
		try {
			const response = await appointmentsApi.getAvailableDoctors()
			if (response.success && response.data) {
				setDoctors(response.data)
			} else {
				toast.error(response.message || "Failed to load doctors")
			}
		} catch (error) {
			toast.error("An error occurred while loading doctors")
			console.error("Error loading doctors:", error)
		}
	}

	const preloadDoctorAvailability = React.useCallback(async (doctorId: string) => {
		try {
			const response = await appointmentsApi.getDoctorAvailability(doctorId)
			if (response.success && response.data) {
				setDoctorAvailability(response.data)
				console.log("response data available: ", response.data)
				return response.data
			}
			setDoctorAvailability([])
			return []
		} catch (error) {
			console.error("Error loading doctor availability:", error)
			setDoctorAvailability([])
			return []
		}
	}, [])

	const handleDateChange = async (value: string) => {
		if (!value) {
			setSelectedDate("")
			setAvailableTimes([])
			return
		}
		if (!selectedDoctorId) {
			setSelectedDate(value)
			return
		}
		const parsedDate = new Date(value)
		if (Number.isNaN(parsedDate.getTime())) {
			toast.error("Invalid date selected")
			return
		}
		const dayOfWeek = parsedDate.toLocaleDateString("en-US", { weekday: "long" })
		let availabilityList = doctorAvailability
		if (!availabilityList.length) {
			availabilityList = await preloadDoctorAvailability(selectedDoctorId)
		}
		const dayAvailability = availabilityList.find(day => day.dayOfWeek === dayOfWeek)
		if (!dayAvailability || !dayAvailability.isAvailable) {
			toast.error("Doctor is not available on this day")
			setSelectedDate("")
			setAvailableTimes([])
			return
		}
		setSelectedDate(value)
	}

	const loadDoctorAvailability = React.useCallback(
		async (doctorId: string, appointmentDate: string) => {
			try {
				setIsLoadingTimeSlots(true)
				setTimeSlotsError(null)

				const availabilityList = doctorAvailability.length
					? doctorAvailability
					: await preloadDoctorAvailability(doctorId)
				console.log("Doctor availability response:", availabilityList)

				if (Array.isArray(availabilityList) && availabilityList.length > 0) {
					const selectedDateObj = new Date(appointmentDate)
					const dayOfWeek = selectedDateObj.toLocaleDateString("en-US", { weekday: "long" })
					console.log("Selected date:", appointmentDate, "Day of week:", dayOfWeek)
					console.log(
						"Available days:",
						availabilityList.map(d => `${d.dayOfWeek}: ${d.isAvailable}`)
					)

					const dayAvailability = availabilityList.find(avail => avail.dayOfWeek === dayOfWeek)
					console.log("Found day availability:", dayAvailability)

					if (dayAvailability && dayAvailability.isAvailable) {
						// Try to get available time slots from backend (which excludes already booked slots)
						try {
							console.log("🔍 Calling getDoctorAvailableTimeSlots with:", {
								doctorId,
								appointmentDate,
							})

							const slotsResponse = await appointmentsApi.getDoctorAvailableTimeSlots(
								doctorId,
								appointmentDate
							)

							console.log("📥 Backend response:", {
								success: slotsResponse.success,
								dataType: Array.isArray(slotsResponse.data) ? "array" : typeof slotsResponse.data,
								dataLength: Array.isArray(slotsResponse.data) ? slotsResponse.data.length : "N/A",
								data: slotsResponse.data,
								message: slotsResponse.message,
								error: slotsResponse.error,
							})

							if (slotsResponse.success && Array.isArray(slotsResponse.data)) {
								if (slotsResponse.data.length > 0) {
									console.log("✅ Available time slots from backend:", slotsResponse.data)
									setAvailableTimes(slotsResponse.data)
									setTimeSlotsError(null)
								} else {
									// Doctor is available but all slots are booked
									console.log("⚠️ Backend returned empty array - all slots booked")
									setAvailableTimes([])
									setTimeSlotsError("all-booked")
								}
								return
							} else {
								console.log("❌ Backend response not successful or not array:", {
									success: slotsResponse.success,
									isArray: Array.isArray(slotsResponse.data),
								})
							}
						} catch (error) {
							console.error("❌ Failed to get available slots from backend:", error)
							// Fall through to fallback logic
						}

						// Fallback: Generate time slots (every 30 minutes) between start and end time
						console.log("🔄 Using fallback time slot generation")
						const times: string[] = []
						const startTimeStr = dayAvailability.startTime || "09:00"
						const endTimeStr = dayAvailability.endTime || "17:00"

						console.log("Start time:", startTimeStr, "End time:", endTimeStr)

						const [startHour, startMin] = startTimeStr.split(":").map(Number)
						const [endHour, endMin] = endTimeStr.split(":").map(Number)

						if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
							console.error("Invalid time format:", { startTimeStr, endTimeStr })
							setAvailableTimes([])
							setTimeSlotsError("invalid-time")
							return
						}

						let currentHour = startHour
						let currentMin = startMin

						while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
							times.push(
								`${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`
							)
							currentMin += 30
							if (currentMin >= 60) {
								currentMin = 0
								currentHour += 1
							}
						}

						console.log("Generated time slots (fallback - may include booked slots):", times)
						setAvailableTimes(times)
						setTimeSlotsError(times.length === 0 ? "no-slots" : null)
					} else {
						setAvailableTimes([])
						setTimeSlotsError("not-available")
						console.log("Doctor is not available on", dayOfWeek)
					}
				} else {
					console.error("Invalid response format:", availabilityList)
					setAvailableTimes([])
					setTimeSlotsError("invalid-response")
				}
			} catch (error) {
				console.error("Error loading doctor availability:", error)
				setAvailableTimes([])
				setTimeSlotsError("error")
			} finally {
				setIsLoadingTimeSlots(false)
			}
		},
		[doctorAvailability, preloadDoctorAvailability]
	)

	React.useEffect(() => {
		loadAppointments()
	}, [])

	React.useEffect(() => {
		if (isBookingOpen) {
			loadDoctors()
		}
	}, [isBookingOpen])

	React.useEffect(() => {
		if (selectedDoctorId) {
			preloadDoctorAvailability(selectedDoctorId)
		} else {
			setDoctorAvailability([])
		}
	}, [selectedDoctorId, preloadDoctorAvailability])

	React.useEffect(() => {
		if (selectedDoctorId && selectedDate) {
			loadDoctorAvailability(selectedDoctorId, selectedDate)
		} else {
			setAvailableTimes([])
		}
	}, [selectedDoctorId, selectedDate, loadDoctorAvailability])

	const handleCancelAppointment = async (appointmentId: string) => {
		if (!confirm("Are you sure you want to cancel this appointment?")) {
			return
		}

		try {
			const response = await appointmentsApi.cancelAppointment(
				appointmentId,
				"Cancelled by patient"
			)
			if (response.success) {
				toast.success("Appointment cancelled successfully")
				loadAppointments()
			} else {
				toast.error(response.message || "Failed to cancel appointment")
			}
		} catch (error) {
			toast.error("An error occurred while cancelling the appointment")
			console.error("Error cancelling appointment:", error)
		}
	}

	const handleApproveReschedule = async (rescheduleId: string) => {
		if (
			!window.confirm(
				"Are you sure you want to approve this reschedule request? The appointment date and time will be updated."
			)
		) {
			return
		}

		try {
			const response = await appointmentsApi.updateRescheduleStatus(rescheduleId, "APPROVED")
			if (response.success) {
				toast.success("Reschedule request approved successfully")
				loadAppointments()
			} else {
				toast.error(response.message || "Failed to approve reschedule request")
			}
		} catch (error) {
			toast.error("An error occurred while approving the reschedule request")
			console.error("Error approving reschedule:", error)
		}
	}

	const handleRejectReschedule = async (rescheduleId: string) => {
		if (!window.confirm("Are you sure you want to reject this reschedule request?")) {
			return
		}

		try {
			const response = await appointmentsApi.updateRescheduleStatus(rescheduleId, "REJECTED")
			if (response.success) {
				toast.success("Reschedule request rejected")
				loadAppointments()
			} else {
				toast.error(response.message || "Failed to reject reschedule request")
			}
		} catch (error) {
			toast.error("An error occurred while rejecting the reschedule request")
			console.error("Error rejecting reschedule:", error)
		}
	}

	const openRescheduleDialog = async (appointment: AppointmentRequest) => {
		// Check if there's already a pending reschedule request
		const hasPendingReschedule = appointment.rescheduleRequests?.some(
			req => req.status === "PENDING"
		)
		if (hasPendingReschedule) {
			toast.error(
				"There is already a pending reschedule request for this appointment. Please wait for it to be resolved."
			)
			return
		}

		setRescheduleAppointmentId(appointment.id)
		setRescheduleAppointment(appointment)
		setRescheduleDate(appointment.requestedDate.split("T")[0])
		setRescheduleTime(appointment.requestedTime)
		setRescheduleReason(appointment.reason || "")
		setRescheduleAvailableTimes([])
		setRescheduleDoctorAvailability([])
		setIsRescheduleDialogOpen(true)

		// Load doctor availability if doctor ID is available
		if (appointment.doctorId) {
			try {
				const availability = await preloadDoctorAvailability(appointment.doctorId)
				setRescheduleDoctorAvailability(availability)
			} catch (error) {
				console.error("Error loading doctor availability for reschedule:", error)
			}
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
		if (!rescheduleAppointment?.doctorId) {
			setRescheduleDate(value)
			return
		}
		const parsedDate = new Date(value)
		if (Number.isNaN(parsedDate.getTime())) {
			toast.error("Invalid date selected")
			return
		}
		const dayOfWeek = parsedDate.toLocaleDateString("en-US", { weekday: "long" })
		let availabilityList = rescheduleDoctorAvailability
		if (!availabilityList.length) {
			availabilityList = await preloadDoctorAvailability(rescheduleAppointment.doctorId)
			setRescheduleDoctorAvailability(availabilityList)
		}
		const dayAvailability = availabilityList.find(day => day.dayOfWeek === dayOfWeek)
		if (!dayAvailability || !dayAvailability.isAvailable) {
			toast.error("Doctor is not available on this day")
			setRescheduleDate("")
			setRescheduleAvailableTimes([])
			setRescheduleTime("")
			setRescheduleTimeSlotsError("not-available")
			return
		}
		setRescheduleDate(value)
		setIsLoadingRescheduleTimeSlots(true)
		setRescheduleTimeSlotsError(null)

		try {
			// Try to get available time slots from backend (which excludes already booked slots)
			try {
				const slotsResponse = await appointmentsApi.getDoctorAvailableTimeSlots(
					rescheduleAppointment.doctorId,
					value
				)
				if (slotsResponse.success && Array.isArray(slotsResponse.data)) {
					if (slotsResponse.data.length > 0) {
						console.log("Available time slots from backend for reschedule:", slotsResponse.data)
						setRescheduleAvailableTimes(slotsResponse.data)
						setRescheduleTimeSlotsError(null)
						// Reset time if it's not in the new available times
						if (rescheduleTime && !slotsResponse.data.includes(rescheduleTime)) {
							setRescheduleTime("")
						}
						return
					} else {
						// Doctor is available but all slots are booked
						setRescheduleAvailableTimes([])
						setRescheduleTimeSlotsError("all-booked")
						setRescheduleTime("")
						return
					}
				}
			} catch (error) {
				console.warn(
					"Failed to get available slots from backend for reschedule, using fallback:",
					error
				)
				// Fall through to fallback logic
			}

			// Fallback: Generate time slots (every 30 minutes) between start and end time
			// Note: This doesn't exclude already-booked slots, but backend validation will prevent double-booking
			const times: string[] = []
			const startTimeStr = dayAvailability.startTime || "09:00"
			const endTimeStr = dayAvailability.endTime || "17:00"

			const [startHour, startMin] = startTimeStr.split(":").map(Number)
			const [endHour, endMin] = endTimeStr.split(":").map(Number)

			if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
				console.error("Invalid time format:", { startTimeStr, endTimeStr })
				setRescheduleAvailableTimes([])
				setRescheduleTimeSlotsError("invalid-time")
				return
			}

			let currentHour = startHour
			let currentMin = startMin

			while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
				times.push(
					`${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`
				)
				currentMin += 30
				if (currentMin >= 60) {
					currentMin = 0
					currentHour += 1
				}
			}

			setRescheduleAvailableTimes(times)
			setRescheduleTimeSlotsError(times.length === 0 ? "no-slots" : null)
			// Reset time if it's not in the new available times
			if (rescheduleTime && !times.includes(rescheduleTime)) {
				setRescheduleTime("")
			}
		} finally {
			setIsLoadingRescheduleTimeSlots(false)
		}
	}

	const handleRescheduleSubmit = async () => {
		if (!rescheduleAppointmentId) return
		if (!rescheduleDate || !rescheduleTime || !rescheduleReason.trim()) {
			toast.error("Please complete all reschedule fields")
			return
		}

		// Validate that selected time is in available times
		if (rescheduleAvailableTimes.length > 0 && !rescheduleAvailableTimes.includes(rescheduleTime)) {
			toast.error("Please select a valid time slot from the available times")
			return
		}

		if (!window.confirm("Are you sure you want to request a reschedule for this appointment?")) {
			return
		}
		try {
			setIsSubmittingReschedule(true)
			const response = await appointmentsApi.requestReschedule(rescheduleAppointmentId, {
				newDate: new Date(rescheduleDate).toISOString(),
				newTime: rescheduleTime,
				reason: rescheduleReason.trim(),
			})
			if (response.success) {
				toast.success("Reschedule request sent successfully")
				setIsRescheduleDialogOpen(false)
				setRescheduleAppointmentId(null)
				setRescheduleAppointment(null)
				setRescheduleDate("")
				setRescheduleTime("")
				setRescheduleReason("")
				setRescheduleAvailableTimes([])
				setRescheduleDoctorAvailability([])
				loadAppointments()
			} else {
				toast.error(response.message || "Failed to request reschedule")
			}
		} catch (error) {
			console.error("Error requesting reschedule:", error)
			toast.error("An error occurred while requesting reschedule")
		} finally {
			setIsSubmittingReschedule(false)
		}
	}

	const handleBookAppointment = async () => {
		const user = getUser()
		if (!user || !user.id) {
			toast.error("Please log in to book an appointment")
			return
		}

		if (!selectedDoctorId || !selectedDate || !selectedTime || !reason.trim()) {
			toast.error("Please fill in all required fields")
			return
		}

		try {
			setIsSubmitting(true)
			const response = await appointmentsApi.createAppointment({
				patientId: user.id,
				doctorId: selectedDoctorId,
				requestedDate: new Date(selectedDate).toISOString(),
				requestedTime: selectedTime,
				reason: reason.trim(),
				notes: notes.trim() || undefined,
				priority: "NORMAL",
			})

			if (response.success) {
				toast.success("Appointment request created successfully!")
				setIsBookingOpen(false)
				// Reset form
				setSelectedDoctorId("")
				setSelectedDate("")
				setSelectedTime("")
				setReason("")
				setNotes("")
				setAvailableTimes([])
				// Reload appointments
				loadAppointments()
			} else {
				toast.error(response.message || "Failed to create appointment request")
			}
		} catch (error) {
			toast.error("An error occurred while booking the appointment")
			console.error("Error booking appointment:", error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const getMinDate = () => {
		const tomorrow = new Date()
		tomorrow.setDate(tomorrow.getDate() + 1)
		return tomorrow.toISOString().split("T")[0]
	}

	// Cleanup handlers for dialogs
	const handleBookingDialogClose = (open: boolean) => {
		setIsBookingOpen(open)
		if (!open) {
			// Reset form state when dialog closes
			setSelectedDoctorId("")
			setSelectedDate("")
			setSelectedTime("")
			setReason("")
			setNotes("")
			setAvailableTimes([])
			setTimeSlotsError(null)
			setDoctorAvailability([])
		}
	}

	const handleRescheduleDialogClose = (open: boolean) => {
		setIsRescheduleDialogOpen(open)
		if (!open) {
			// Reset reschedule form state when dialog closes
			setRescheduleAppointmentId(null)
			setRescheduleAppointment(null)
			setRescheduleDate("")
			setRescheduleTime("")
			setRescheduleReason("")
			setRescheduleAvailableTimes([])
			setRescheduleDoctorAvailability([])
			setRescheduleTimeSlotsError(null)
		}
	}

	// Filter appointments based on selected tab
	const filteredAppointments = React.useMemo(() => {
		if (filterStatus === "all") {
			return appointments
		}
		return appointments.filter(apt => apt.status === filterStatus.toUpperCase())
	}, [appointments, filterStatus])

	// Reset to page 1 when filter changes
	React.useEffect(() => {
		setCurrentPage(1)
	}, [filterStatus])

	// Calculate pagination
	const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage)
	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex)

	const goToPage = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page)
			window.scrollTo({ top: 0, behavior: "smooth" })
		}
	}

	// Get count for each status
	const getStatusCount = (status: string) => {
		if (status === "all") {
			return appointments.length
		}
		return appointments.filter(apt => apt.status === status.toUpperCase()).length
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
			<SidebarWrapper role="patient" variant="inset" />
			<SidebarInset>
				<RoleHeader title="Schedule" description="View and manage your appointments" />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
							<div className="px-4 lg:px-6">
								<div className="mb-4 flex items-center justify-between">
									<h2 className="text-xl font-semibold">My Appointments</h2>
									<Button onClick={() => setIsBookingOpen(true)}>Book Appointment</Button>
								</div>

								{isLoading ? (
									<div className="text-muted-foreground py-8 text-center">
										Loading appointments...
									</div>
								) : (
									<Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full">
										<TabsList className="mb-6 grid w-full max-w-2xl grid-cols-5">
											<TabsTrigger value="all">All ({getStatusCount("all")})</TabsTrigger>
											<TabsTrigger value="pending">
												Pending ({getStatusCount("pending")})
											</TabsTrigger>
											<TabsTrigger value="confirmed">
												Confirmed ({getStatusCount("confirmed")})
											</TabsTrigger>
											<TabsTrigger value="cancelled">
												Cancelled ({getStatusCount("cancelled")})
											</TabsTrigger>
											<TabsTrigger value="rescheduled">
												Rescheduled ({getStatusCount("rescheduled")})
											</TabsTrigger>
										</TabsList>

										<TabsContent value={filterStatus} className="mt-0">
											{filteredAppointments.length === 0 ? (
												<Card>
													<CardContent className="text-muted-foreground py-8 text-center">
														<p>
															No {filterStatus === "all" ? "" : filterStatus} appointments found.
														</p>
														{filterStatus === "all" && (
															<Button
																variant="outline"
																className="mt-4"
																onClick={() => setIsBookingOpen(true)}
															>
																Book Your First Appointment
															</Button>
														)}
													</CardContent>
												</Card>
											) : (
												<>
													<div className="grid gap-4">
														{paginatedAppointments.map(appointment => (
															<Card
																key={appointment.id}
																className="hover:bg-accent/50 cursor-pointer transition-colors"
																onClick={() => {
																	setSelectedAppointment(appointment)
																	setIsDetailsDialogOpen(true)
																}}
															>
																<CardHeader>
																	<div className="flex items-center justify-between">
																		<div>
																			<CardTitle>
																				{appointment.doctor?.doctorInfo
																					? `Dr. ${appointment.doctor.doctorInfo.firstName} ${appointment.doctor.doctorInfo.lastName}`
																					: "Unknown Doctor"}
																			</CardTitle>
																			<CardDescription>
																				{formatDate(appointment.requestedDate)} at{" "}
																				{formatTime(appointment.requestedTime)}
																			</CardDescription>
																		</div>
																		<Badge variant={getStatusBadgeVariant(appointment.status)}>
																			{appointment.status}
																		</Badge>
																	</div>
																</CardHeader>
																<CardContent>
																	<div className="space-y-2">
																		<p className="text-muted-foreground text-sm">
																			<strong>Reason:</strong> {appointment.reason}
																		</p>
																		{appointment.doctor?.doctorInfo?.specialization && (
																			<p className="text-muted-foreground text-sm">
																				<strong>Specialization:</strong>{" "}
																				{appointment.doctor.doctorInfo.specialization}
																			</p>
																		)}
																		{appointment.notes && (
																			<p className="text-muted-foreground text-sm">
																				<strong>Notes:</strong> {appointment.notes}
																			</p>
																		)}
																		{/* Pending Reschedule Requests */}
																		{appointment.rescheduleRequests &&
																			appointment.rescheduleRequests.length > 0 && (
																				<div className="mt-4 space-y-2">
																					{appointment.rescheduleRequests
																						.filter(
																							(req: RescheduleRequest) => req.status === "PENDING"
																						)
																						.map((req: RescheduleRequest) => {
																							// Only show approve/reject buttons if the request was NOT made by the patient
																							// (i.e., if doctor requested it, patient can approve/reject)
																							const canApproveReject =
																								req.requestedByRole !== "PATIENT"
																							return (
																								<div
																									key={req.id}
																									className="rounded-lg border border-orange-200 bg-white p-3"
																								>
																									<p className="text-sm font-medium text-orange-900">
																										{req.requestedByRole === "PATIENT"
																											? "Your Reschedule Request Pending"
																											: "Reschedule Request Pending"}
																									</p>
																									<p className="mt-1 text-xs text-orange-700">
																										Requested: {formatDate(req.newDate)} at{" "}
																										{formatTime(req.newTime)}
																									</p>
																									{req.reason && (
																										<p className="mt-1 text-xs text-orange-700">
																											<strong>Reason:</strong> {req.reason}
																										</p>
																									)}
																									{canApproveReject && (
																										<div className="mt-2 flex gap-2">
																											<Button
																												variant="outline"
																												size="sm"
																												onClick={e => {
																													e.stopPropagation()
																													handleApproveReschedule(req.id)
																												}}
																												className="border-green-500 bg-green-500 text-xs text-white hover:bg-green-600"
																											>
																												Approve
																											</Button>
																											<Button
																												variant="outline"
																												size="sm"
																												onClick={e => {
																													e.stopPropagation()
																													handleRejectReschedule(req.id)
																												}}
																												className="border-red-500 bg-red-500 text-xs text-white hover:bg-red-600"
																											>
																												Reject
																											</Button>
																										</div>
																									)}
																									{!canApproveReject && (
																										<p className="mt-2 text-xs text-orange-600 italic">
																											Waiting for doctor&apos;s response...
																										</p>
																									)}
																								</div>
																							)
																						})}
																				</div>
																			)}
																		{(appointment.status === "PENDING" ||
																			appointment.status === "CONFIRMED") && (
																			<div className="mt-4 flex flex-wrap gap-2">
																				<Button
																					variant="outline"
																					size="sm"
																					onClick={e => {
																						e.stopPropagation()
																						handleCancelAppointment(appointment.id)
																					}}
																					className="text-destructive hover:text-destructive"
																				>
																					Cancel Appointment
																				</Button>
																				{appointment.status === "CONFIRMED" &&
																					(() => {
																						const hasPendingReschedule =
																							appointment.rescheduleRequests?.some(
																								(req: RescheduleRequest) => req.status === "PENDING"
																							)
																						return (
																							<Button
																								variant="secondary"
																								size="sm"
																								onClick={e => {
																									e.stopPropagation()
																									openRescheduleDialog(appointment)
																								}}
																								disabled={hasPendingReschedule}
																								title={
																									hasPendingReschedule
																										? "You already have a pending reschedule request for this appointment"
																										: ""
																								}
																							>
																								Request Reschedule
																							</Button>
																						)
																					})()}
																			</div>
																		)}
																	</div>
																</CardContent>
															</Card>
														))}
													</div>

													{/* Pagination Controls */}
													{totalPages > 1 && (
														<div className="mt-6 flex items-center justify-between">
															<div className="text-muted-foreground text-sm">
																Showing {startIndex + 1} to{" "}
																{Math.min(endIndex, filteredAppointments.length)} of{" "}
																{filteredAppointments.length} appointments
															</div>
															<div className="flex items-center gap-2">
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => goToPage(currentPage - 1)}
																	disabled={currentPage === 1}
																>
																	Previous
																</Button>
																<div className="flex items-center gap-1">
																	{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
																		// Show first page, last page, current page, and pages around current
																		if (
																			page === 1 ||
																			page === totalPages ||
																			(page >= currentPage - 1 && page <= currentPage + 1)
																		) {
																			return (
																				<Button
																					key={page}
																					variant={currentPage === page ? "default" : "outline"}
																					size="sm"
																					onClick={() => goToPage(page)}
																					className={currentPage === page ? "" : "min-w-10"}
																				>
																					{page}
																				</Button>
																			)
																		} else if (
																			page === currentPage - 2 ||
																			page === currentPage + 2
																		) {
																			return (
																				<span key={page} className="text-muted-foreground px-2">
																					...
																				</span>
																			)
																		}
																		return null
																	})}
																</div>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => goToPage(currentPage + 1)}
																	disabled={currentPage === totalPages}
																>
																	Next
																</Button>
															</div>
														</div>
													)}
												</>
											)}
										</TabsContent>
									</Tabs>
								)}
							</div>
						</div>
					</div>
				</div>
			</SidebarInset>

			{/* Booking Dialog */}
			<Dialog open={isBookingOpen} onOpenChange={handleBookingDialogClose}>
				<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Book an Appointment</DialogTitle>
						<DialogDescription>
							Select a doctor, date, and time for your appointment
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<Field>
							<FieldLabel>Select Doctor *</FieldLabel>
							<Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Choose a doctor">
										{selectedDoctorId && doctors.length > 0
											? (() => {
													const selected = doctors.find(d => d.id === selectedDoctorId)
													return selected
														? `${selected.name} - ${selected.specialization}`
														: selectedDoctorId
												})()
											: undefined}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{doctors.length === 0 ? (
										<div className="text-muted-foreground px-2 py-4 text-center text-sm">
											Loading doctors...
										</div>
									) : (
										doctors.map(doctor => (
											<SelectItem key={doctor.id} value={doctor.id}>
												{doctor.name} - {doctor.specialization}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
							<FieldDescription>Choose a doctor for your appointment</FieldDescription>
						</Field>

						<Field>
							<FieldLabel>Select Date *</FieldLabel>
							<Input
								type="date"
								value={selectedDate}
								onChange={e => handleDateChange(e.target.value)}
								min={getMinDate()}
								disabled={!selectedDoctorId}
							/>
							<FieldDescription>
								Select a date for your appointment (tomorrow or later)
							</FieldDescription>
						</Field>

						{selectedDate && (
							<Field>
								<FieldLabel>Select Time *</FieldLabel>
								{isLoadingTimeSlots ? (
									<div className="text-muted-foreground py-2 text-sm">
										Loading available time slots...
									</div>
								) : availableTimes.length > 0 ? (
									<Select
										value={selectedTime}
										onValueChange={value => setSelectedTime(value || "")}
									>
										<SelectTrigger>
											<SelectValue placeholder="Choose a time slot" />
										</SelectTrigger>
										<SelectContent>
											{availableTimes.map(time => {
												const [hours, minutes] = time.split(":")
												const hour = parseInt(hours)
												const ampm = hour >= 12 ? "PM" : "AM"
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
									<div className="text-muted-foreground py-2 text-sm">
										{timeSlotsError === "all-booked"
											? "All time slots for this date are already booked. Please select another date."
											: timeSlotsError === "not-available"
												? "Doctor is not available on this day. Please select another date."
												: "No available time slots for this date. Please select another date."}
									</div>
								)}
								<FieldDescription>
									{isLoadingTimeSlots
										? "Checking available time slots..."
										: availableTimes.length > 0
											? "Available time slots for the selected date"
											: "Please select a different date"}
								</FieldDescription>
							</Field>
						)}

						<Field>
							<FieldLabel>Reason for Visit *</FieldLabel>
							<Input
								type="text"
								value={reason}
								onChange={e => setReason(e.target.value)}
								placeholder="e.g., Regular checkup, Follow-up consultation"
							/>
							<FieldDescription>Briefly describe the reason for your appointment</FieldDescription>
						</Field>

						<Field>
							<FieldLabel>Additional Notes (Optional)</FieldLabel>
							<Input
								type="text"
								value={notes}
								onChange={e => setNotes(e.target.value)}
								placeholder="Any additional information you'd like to share"
							/>
							<FieldDescription>Any additional information for the doctor</FieldDescription>
						</Field>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsBookingOpen(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							onClick={handleBookAppointment}
							disabled={
								isSubmitting ||
								!selectedDoctorId ||
								!selectedDate ||
								!selectedTime ||
								!reason.trim()
							}
						>
							{isSubmitting ? "Booking..." : "Book Appointment"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reschedule Dialog */}
			<Dialog open={isRescheduleDialogOpen} onOpenChange={handleRescheduleDialogClose}>
				<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Request Reschedule</DialogTitle>
						<DialogDescription>
							Choose a new date and time for your appointment. The doctor will need to confirm the
							new schedule.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<Field>
							<FieldLabel>New Date *</FieldLabel>
							<Input
								type="date"
								value={rescheduleDate}
								min={getMinDate()}
								onChange={e => handleRescheduleDateChange(e.target.value)}
								disabled={!rescheduleAppointment?.doctorId}
							/>
							<FieldDescription>
								Select a date for the rescheduled appointment (tomorrow or later)
							</FieldDescription>
						</Field>

						{rescheduleDate && (
							<Field>
								<FieldLabel>Select Time *</FieldLabel>
								{isLoadingRescheduleTimeSlots ? (
									<div className="text-muted-foreground py-2 text-sm">
										Loading available time slots...
									</div>
								) : rescheduleAvailableTimes.length > 0 ? (
									<Select value={rescheduleTime} onValueChange={setRescheduleTime}>
										<SelectTrigger>
											<SelectValue placeholder="Choose a time slot" />
										</SelectTrigger>
										<SelectContent>
											{rescheduleAvailableTimes.map(time => {
												const [hours, minutes] = time.split(":")
												const hour = parseInt(hours)
												const ampm = hour >= 12 ? "PM" : "AM"
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
									<div className="text-muted-foreground py-2 text-sm">
										{rescheduleTimeSlotsError === "all-booked"
											? "All time slots for this date are already booked. Please select another date."
											: rescheduleTimeSlotsError === "not-available"
												? "Doctor is not available on this day. Please select another date."
												: "No available time slots for this date. Please select another date."}
									</div>
								)}
								<FieldDescription>
									{isLoadingRescheduleTimeSlots
										? "Checking available time slots..."
										: rescheduleAvailableTimes.length > 0
											? "Available time slots for the selected date"
											: "Please select a different date"}
								</FieldDescription>
							</Field>
						)}

						<Field>
							<FieldLabel>Reason *</FieldLabel>
							<Input
								value={rescheduleReason}
								onChange={e => setRescheduleReason(e.target.value)}
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
							disabled={
								isSubmittingReschedule ||
								!rescheduleDate ||
								!rescheduleTime ||
								!rescheduleReason.trim() ||
								(rescheduleAvailableTimes.length > 0 &&
									!rescheduleAvailableTimes.includes(rescheduleTime))
							}
						>
							{isSubmittingReschedule ? "Submitting..." : "Submit Reschedule"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Appointment Details Dialog */}
			<Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
				<DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Appointment Details</DialogTitle>
						<DialogDescription>Complete information about your appointment</DialogDescription>
					</DialogHeader>

					{selectedAppointment && (
						<div className="space-y-6 py-4">
							{/* Doctor Information */}
							<div className="space-y-2">
								<h3 className="text-lg font-semibold">Doctor Information</h3>
								<div className="bg-muted/50 grid grid-cols-2 gap-4 rounded-lg p-4">
									<div>
										<p className="text-muted-foreground text-sm">Doctor Name</p>
										<p className="font-medium">
											{selectedAppointment.doctor?.doctorInfo
												? `Dr. ${selectedAppointment.doctor.doctorInfo.firstName} ${selectedAppointment.doctor.doctorInfo.lastName}`
												: "Unknown Doctor"}
										</p>
									</div>
									{selectedAppointment.doctor?.doctorInfo?.specialization && (
										<div>
											<p className="text-muted-foreground text-sm">Specialization</p>
											<p className="font-medium">
												{selectedAppointment.doctor.doctorInfo.specialization}
											</p>
										</div>
									)}
									{selectedAppointment.doctor?.email && (
										<div>
											<p className="text-muted-foreground text-sm">Email</p>
											<p className="font-medium">{selectedAppointment.doctor.email}</p>
										</div>
									)}
								</div>
							</div>

							{/* Appointment Details - Vertical Stepper */}
							<div className="space-y-3">
								<h3 className="text-lg font-semibold">Appointment Timeline</h3>
								<div className="relative">
									{/* Vertical Stepper */}
									{(() => {
										const approvedReschedule = selectedAppointment.rescheduleRequests?.find(
											(req: RescheduleRequest) => req.status === "APPROVED"
										)
										const hasOriginalDate =
											approvedReschedule &&
											approvedReschedule.currentDate &&
											approvedReschedule.currentTime
										const isRescheduled = selectedAppointment.status === "RESCHEDULED"

										// Build steps array
										const steps: Array<{
											number: number
											label: string
											value: string
											description: string
											color: string
											showConnector: boolean
											showStatus?: boolean
										}> = []

										// Step 1: Requested (with Status and Priority)
										steps.push({
											number: 1,
											label: "REQUESTED ON",
											value: `${formatDate(selectedAppointment.createdAt)} at ${formatTime(new Date(selectedAppointment.createdAt).toTimeString().slice(0, 5))}`,
											description: "Appointment request created",
											color: "bg-primary border-primary text-primary-foreground",
											showConnector: true,
											showStatus: true,
										})

										// Step 2: Original Date (if rescheduled with original date)
										if (isRescheduled && hasOriginalDate && approvedReschedule) {
											steps.push({
												number: 2,
												label: "ORIGINAL DATE & TIME",
												value: `${formatDate(approvedReschedule.currentDate!)} at ${formatTime(approvedReschedule.currentTime!)}`,
												description: "Originally scheduled",
												color: "bg-orange-500 border-orange-500 text-white",
												showConnector: true,
											})
										}

										// Step 2/3: Scheduled/Rescheduled Date (with Status and Priority)
										const stepNumber = isRescheduled && hasOriginalDate ? 3 : 2
										const statusColor =
											selectedAppointment.status === "CONFIRMED"
												? "bg-green-500 border-green-500 text-white"
												: selectedAppointment.status === "PENDING"
													? "bg-orange-500 border-orange-500 text-white"
													: selectedAppointment.status === "CANCELLED" ||
														  selectedAppointment.status === "REJECTED"
														? "bg-red-500 border-red-500 text-white"
														: isRescheduled
															? "bg-purple-500 border-purple-500 text-white"
															: "bg-muted border-muted text-muted-foreground"

										steps.push({
											number: stepNumber,
											label: isRescheduled ? "RESCHEDULED DATE & TIME" : "SCHEDULED DATE & TIME",
											value: `${formatDate(selectedAppointment.requestedDate)} at ${formatTime(selectedAppointment.requestedTime)}`,
											description: isRescheduled
												? "Appointment rescheduled"
												: "Appointment scheduled",
											color: statusColor,
											showConnector: false,
										})

										return (
											<div className="space-y-6">
												{steps.map(step => (
													<div key={step.number} className="flex gap-4">
														<div className="flex flex-col items-center">
															<div
																className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${step.color}`}
															>
																<span className="text-sm font-medium">{step.number}</span>
															</div>
															{step.showConnector && (
																<div className="bg-muted mt-2 h-full min-h-16 w-0.5"></div>
															)}
														</div>
														<div className={`flex-1 ${step.showConnector ? "pb-6" : ""}`}>
															<div className="space-y-1">
																<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
																	{step.label}
																</p>
																<p
																	className={`text-base font-semibold ${
																		step.number === (isRescheduled && hasOriginalDate ? 3 : 2) &&
																		isRescheduled
																			? "text-green-600"
																			: step.number === 2 && isRescheduled && hasOriginalDate
																				? "text-orange-600"
																				: ""
																	}`}
																>
																	{step.value}
																</p>
																<p className="text-muted-foreground text-sm">{step.description}</p>
																{step.showStatus && (
																	<div className="mt-3 space-y-2 border-t pt-3">
																		<div className="space-y-1">
																			<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
																				CURRENT STATUS
																			</p>
																			<div>
																				<Badge
																					variant={getStatusBadgeVariant(
																						selectedAppointment.status
																					)}
																					className="text-sm"
																				>
																					{selectedAppointment.status}
																				</Badge>
																			</div>
																		</div>
																		<div className="space-y-1">
																			<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
																				PRIORITY
																			</p>
																			<p className="text-base font-semibold capitalize">
																				{selectedAppointment.priority.toLowerCase()}
																			</p>
																		</div>
																	</div>
																)}
															</div>
														</div>
													</div>
												))}
											</div>
										)
									})()}
								</div>
							</div>

							{/* Reason and Notes */}
							<div className="space-y-2">
								<h3 className="text-lg font-semibold">Reason & Notes</h3>
								<div className="bg-muted/50 space-y-3 rounded-lg p-4">
									<div>
										<p className="text-muted-foreground mb-1 text-sm">Reason for Visit</p>
										<p className="font-medium">{selectedAppointment.reason}</p>
									</div>
									{selectedAppointment.notes && (
										<div>
											<p className="text-muted-foreground mb-1 text-sm">Additional Notes</p>
											<p className="font-medium">{selectedAppointment.notes}</p>
										</div>
									)}
								</div>
							</div>

							{/* Reschedule Requests */}
							{selectedAppointment.rescheduleRequests &&
								selectedAppointment.rescheduleRequests.length > 0 && (
									<div className="space-y-2">
										<h3 className="text-lg font-semibold">Reschedule History</h3>
										<div className="space-y-2">
											{selectedAppointment.rescheduleRequests.map((req: RescheduleRequest) => (
												<div
													key={req.id}
													className="bg-muted/50 rounded-lg border border-orange-200 p-4"
												>
													<div className="mb-2 flex items-center justify-between">
														<Badge
															variant={
																req.status === "APPROVED"
																	? "default"
																	: req.status === "REJECTED"
																		? "destructive"
																		: "outline"
															}
															className={
																req.status === "PENDING"
																	? "border-orange-500/20 bg-orange-500/10 text-orange-700"
																	: req.status === "APPROVED"
																		? "border-green-500/20 bg-green-500/10 text-green-700"
																		: ""
															}
														>
															{req.status}
														</Badge>
														<p className="text-muted-foreground text-xs">
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
															<p className="text-muted-foreground text-xs">Reason</p>
															<p className="text-sm font-medium">{req.reason}</p>
														</div>
													)}
													{req.requestedByRole && (
														<p className="text-muted-foreground mt-2 text-xs">
															Requested by: {req.requestedByRole === "PATIENT" ? "You" : "Doctor"}
														</p>
													)}
												</div>
											))}
										</div>
									</div>
								)}

							{/* Actions */}
							<div className="flex gap-2 border-t pt-4">
								{(selectedAppointment.status === "PENDING" ||
									selectedAppointment.status === "CONFIRMED") && (
									<>
										<Button
											variant="outline"
											size="sm"
											onClick={e => {
												e.stopPropagation()
												handleCancelAppointment(selectedAppointment.id)
												setIsDetailsDialogOpen(false)
											}}
											className="text-destructive hover:text-destructive"
										>
											Cancel Appointment
										</Button>
										{selectedAppointment.status === "CONFIRMED" &&
											(() => {
												const hasPendingReschedule = selectedAppointment.rescheduleRequests?.some(
													(req: RescheduleRequest) => req.status === "PENDING"
												)
												return (
													<Button
														variant="secondary"
														size="sm"
														onClick={e => {
															e.stopPropagation()
															openRescheduleDialog(selectedAppointment)
															setIsDetailsDialogOpen(false)
														}}
														disabled={hasPendingReschedule}
														title={
															hasPendingReschedule
																? "You already have a pending reschedule request for this appointment"
																: ""
														}
													>
														Request Reschedule
													</Button>
												)
											})()}
									</>
								)}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</SidebarProvider>
	)
}
