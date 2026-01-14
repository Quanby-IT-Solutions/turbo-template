import * as React from "react"
import { toast } from "sonner"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Button } from "@/core/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { getUser } from "@/services/api/client"
import { appointmentsApi } from "@/features/appointments/api/appointments-api"
import type { DoctorAvailability } from "@/services/api/types"
import { formatTime, getMinDate } from "../utils/date-formatters"
import { generateTimeSlots } from "../utils/appointment-helpers"
import { DatePickerWithCalendar } from "./date-picker-with-calendar"

interface BookingDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	doctors: Array<{ id: string; name: string; specialization: string }>
	existingAppointments?: Array<{ requestedDate: string; requestedTime: string; doctorId: string; status: string }>
	onSuccess: () => void
}

export function BookingDialog({ open, onOpenChange, doctors, existingAppointments = [], onSuccess }: BookingDialogProps) {
	const [selectedDoctorId, setSelectedDoctorId] = React.useState("")
	const [selectedDate, setSelectedDate] = React.useState<Date | undefined>()
	const [selectedTime, setSelectedTime] = React.useState("")
	const [reason, setReason] = React.useState("")
	const [notes, setNotes] = React.useState("")
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [availableTimes, setAvailableTimes] = React.useState<string[]>([])
	const [isLoadingTimeSlots, setIsLoadingTimeSlots] = React.useState(false)
	const [timeSlotsError, setTimeSlotsError] = React.useState<string | null>(null)
	const [doctorAvailability, setDoctorAvailability] = React.useState<DoctorAvailability[]>([])

	// Reset form when dialog closes
	React.useEffect(() => {
		if (!open) {
			setSelectedDoctorId("")
			setSelectedDate(undefined)
			setSelectedTime("")
			setReason("")
			setNotes("")
			setAvailableTimes([])
			setTimeSlotsError(null)
			setDoctorAvailability([])
		}
	}, [open])

	// Load doctor availability when doctor is selected
	React.useEffect(() => {
		if (!selectedDoctorId) {
			setDoctorAvailability([])
			return
		}

		const loadAvailability = async () => {
			try {
				const response = await appointmentsApi.getDoctorAvailability(selectedDoctorId)
				if (response.success && response.data) {
					setDoctorAvailability(response.data)
				}
			} catch (error) {
				console.error("Error loading doctor availability:", error)
			}
		}

		loadAvailability()
	}, [selectedDoctorId])

	// Load time slots when date is selected
	React.useEffect(() => {
		if (!selectedDoctorId || !selectedDate) {
			setAvailableTimes([])
			setSelectedTime("")
			return
		}

		const loadTimeSlots = async () => {
			setIsLoadingTimeSlots(true)
			setTimeSlotsError(null)
			setSelectedTime("") // Reset selected time

			try {
				const dayOfWeek = selectedDate.toLocaleDateString("en-US", { weekday: "long" })
				const dayAvailability = doctorAvailability.find(avail => avail.dayOfWeek === dayOfWeek)

				if (!dayAvailability || !dayAvailability.isAvailable) {
					setAvailableTimes([])
					setTimeSlotsError("not-available")
					setIsLoadingTimeSlots(false)
					return
				}

				// Try to get available slots from backend
				try {
					const dateString = selectedDate.toISOString().split("T")[0] || ""
					const slotsResponse = await appointmentsApi.getDoctorAvailableTimeSlots(
						selectedDoctorId,
						dateString
					)

					if (slotsResponse.success && Array.isArray(slotsResponse.data)) {
						if (slotsResponse.data.length > 0) {
							setAvailableTimes(slotsResponse.data)
							setTimeSlotsError(null)
							setIsLoadingTimeSlots(false)
							return
						} else {
							// Don't return here - fall through to fallback generation
							console.log("No slots available from backend, using fallback")
						}
					}
				} catch (error) {
					console.warn("Failed to get slots from backend, using fallback:", error)
				}

				// Fallback: Generate time slots
				const times = generateTimeSlots(
					dayAvailability.startTime || "09:00",
					dayAvailability.endTime || "17:00"
				)
				setAvailableTimes(times)
				setTimeSlotsError(times.length === 0 ? "no-slots" : null)
			} catch (error) {
				console.error("Error loading time slots:", error)
				setAvailableTimes([])
				setTimeSlotsError("error")
			} finally {
				setIsLoadingTimeSlots(false)
			}
		}

		loadTimeSlots()
	}, [selectedDoctorId, selectedDate, doctorAvailability])

	const handleDateChange = (date: Date | undefined) => {
		if (!date) {
			setSelectedDate(undefined)
			setAvailableTimes([])
			setSelectedTime("")
			setTimeSlotsError(null)
			return
		}

		console.log("Date selected:", date)
		setSelectedDate(date)
		// Don't reset time here, let the useEffect handle it
	}

	const handleSubmit = async () => {
		const user = getUser()
		if (!user || !user.id) {
			toast.error("Please log in to book an appointment")
			return
		}

		if (!selectedDoctorId || !selectedDate || !selectedTime || !reason.trim()) {
			toast.error("Please fill in all required fields")
			return
		}

		// Check for duplicate appointments (same doctor, date, and time)
		const selectedDateString = selectedDate.toISOString().split("T")[0]
		const duplicateAppointment = existingAppointments.find(apt => {
			// Only check non-cancelled/non-rejected appointments
			if (apt.status === "CANCELLED" || apt.status === "REJECTED") {
				return false
			}
			const aptDateString = apt.requestedDate.split("T")[0]
			return (
				apt.doctorId === selectedDoctorId &&
				aptDateString === selectedDateString &&
				apt.requestedTime === selectedTime
			)
		})

		if (duplicateAppointment) {
			toast.error("You already have an appointment with this doctor at the same date and time. Please select a different date or time.")
			return
		}

		try {
			setIsSubmitting(true)
			const response = await appointmentsApi.createAppointment({
				patientId: user.id,
				doctorId: selectedDoctorId,
				requestedDate: selectedDate.toISOString(),
				requestedTime: selectedTime,
				reason: reason.trim(),
				notes: notes.trim() || undefined,
				priority: "NORMAL",
			})

			if (response.success) {
				toast.success("Appointment request created successfully!")
				onOpenChange(false)
				onSuccess()
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
						<Select value={selectedDoctorId} onValueChange={(value) => setSelectedDoctorId(value ?? "")}>
							<SelectTrigger className="w-full">
								<SelectValue>
									{selectedDoctorId && doctors.length > 0
										? (() => {
												const selected = doctors.find(d => d.id === selectedDoctorId)
												return selected
													? `${selected.name} - ${selected.specialization}`
													: selectedDoctorId
											})()
										: "Choose a doctor"}
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
						<DatePickerWithCalendar
							value={selectedDate}
							onChange={handleDateChange}
							doctorAvailability={doctorAvailability}
							minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
							disabled={!selectedDoctorId}
							placeholder="Select appointment date"
						/>
						<FieldDescription>
							Select a date for your appointment (only available days are shown)
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
								<Select value={selectedTime} onValueChange={(value) => setSelectedTime(value ?? "")}>
									<SelectTrigger>
										<SelectValue>{selectedTime ? undefined : "Choose a time slot"}</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{availableTimes.map(time => (
											<SelectItem key={time} value={time}>
												{formatTime(time)}
											</SelectItem>
										))}
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
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
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
	)
}