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
import { appointmentsApi } from "@/features/appointments/api/appointments-api"
import type { AppointmentRequest, DoctorAvailability } from "@/services/api/types"
import { formatTime, getMinDate } from "../utils/date-formatters"
import { generateTimeSlots } from "../utils/appointment-helpers"
import { DatePickerWithCalendar } from "./date-picker-with-calendar"

interface RescheduleDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	appointment: AppointmentRequest | null
	existingAppointments?: Array<{ id: string; requestedDate: string; requestedTime: string; doctorId: string; status: string }>
	onSuccess: () => void
}

export function RescheduleDialog({
	open,
	onOpenChange,
	appointment,
	existingAppointments = [],
	onSuccess,
}: RescheduleDialogProps) {
	const [rescheduleDate, setRescheduleDate] = React.useState<Date | undefined>()
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

	// Initialize form when appointment changes
	React.useEffect(() => {
		if (appointment && open) {
			const currentDate = new Date(appointment.requestedDate)
			setRescheduleDate(currentDate)
			setRescheduleTime(appointment.requestedTime)
			setRescheduleReason(appointment.reason || "")
			setRescheduleAvailableTimes([])
			setRescheduleDoctorAvailability([])

			// Load doctor availability
			if (appointment.doctorId) {
				loadDoctorAvailability(appointment.doctorId)
			}
		}
	}, [appointment, open])

	// Reset form when dialog closes
	React.useEffect(() => {
		if (!open) {
			setRescheduleDate(undefined)
			setRescheduleTime("")
			setRescheduleReason("")
			setRescheduleAvailableTimes([])
			setRescheduleDoctorAvailability([])
			setRescheduleTimeSlotsError(null)
		}
	}, [open])

	const loadDoctorAvailability = async (doctorId: string) => {
		try {
			const response = await appointmentsApi.getDoctorAvailability(doctorId)
			if (response.success && response.data) {
				setRescheduleDoctorAvailability(response.data)
			}
		} catch (error) {
			console.error("Error loading doctor availability for reschedule:", error)
		}
	}

	const handleRescheduleDateChange = async (date: Date | undefined) => {
        if (!date) {
            setRescheduleDate(undefined)
            setRescheduleAvailableTimes([])
            setRescheduleTime("")
            setRescheduleTimeSlotsError(null)
            return
        }
    
        if (!appointment?.doctorId) {
            setRescheduleDate(date)
            return
        }
    
        setRescheduleDate(date)
        setRescheduleTime("") // Reset time when date changes
        setIsLoadingRescheduleTimeSlots(true)
        setRescheduleTimeSlotsError(null)
    
        try {
            const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" })
            let availabilityList = rescheduleDoctorAvailability
    
            // Load availability if not already loaded
            if (!availabilityList.length) {
                const response = await appointmentsApi.getDoctorAvailability(appointment.doctorId)
                if (response.success && response.data) {
                    availabilityList = response.data
                    setRescheduleDoctorAvailability(availabilityList)
                }
            }
    
            const dayAvailability = availabilityList.find(day => day.dayOfWeek === dayOfWeek)
    
            // Check if doctor is available on this day
            if (!dayAvailability || !dayAvailability.isAvailable) {
                console.log("Doctor not available on", dayOfWeek)
                setRescheduleAvailableTimes([])
                setRescheduleTimeSlotsError("not-available")
                return
            }
    
            // Try to get available time slots from backend
            try {
                const dateString = date.toISOString().split("T")[0] || ""
                console.log("Fetching slots for doctor:", appointment.doctorId, "date:", dateString)
                
                const slotsResponse = await appointmentsApi.getDoctorAvailableTimeSlots(
                    appointment.doctorId,
                    dateString
                )
                
                console.log("Slots response:", slotsResponse)
                
                if (slotsResponse.success && Array.isArray(slotsResponse.data)) {
                    if (slotsResponse.data.length > 0) {
                        console.log("Available slots:", slotsResponse.data)
                        setRescheduleAvailableTimes(slotsResponse.data)
                        setRescheduleTimeSlotsError(null)
                        setIsLoadingRescheduleTimeSlots(false)
                        return
                    } else {
                        console.log("No slots available from backend, using fallback")
                        // Don't return here - fall through to fallback generation
                    }
                } else {
                    // If response is not in expected format, fall through to fallback
                    console.log("Response not in expected format, using fallback")
                }
            } catch (error) {
                console.error("Error fetching slots from backend:", error)
                // Continue to fallback
            }
    
            // Fallback: Generate time slots based on doctor's general availability
            console.log("Using fallback time slot generation")
            const times = generateTimeSlots(
                dayAvailability.startTime || "09:00",
                dayAvailability.endTime || "17:00"
            )
            
            console.log("Generated fallback times:", times)
            setRescheduleAvailableTimes(times)
            setRescheduleTimeSlotsError(times.length === 0 ? "no-slots" : null)
        } finally {
            setIsLoadingRescheduleTimeSlots(false)
        }
    }

	const handleRescheduleSubmit = async () => {
		if (!appointment?.id) return
		if (!rescheduleDate || !rescheduleTime || !rescheduleReason.trim()) {
			toast.error("Please complete all reschedule fields")
			return
		}

		// Validate that selected time is in available times
		if (
			rescheduleAvailableTimes.length > 0 &&
			!rescheduleAvailableTimes.includes(rescheduleTime)
		) {
			toast.error("Please select a valid time slot from the available times")
			return
		}

		// Check for duplicate appointments (same doctor, date, and time), excluding the current appointment
		const rescheduleDateString = rescheduleDate.toISOString().split("T")[0]
		const duplicateAppointment = existingAppointments.find(apt => {
			// Skip the current appointment being rescheduled
			if (apt.id === appointment.id) {
				return false
			}
			// Only check non-cancelled/non-rejected appointments
			if (apt.status === "CANCELLED" || apt.status === "REJECTED") {
				return false
			}
			const aptDateString = apt.requestedDate.split("T")[0]
			return (
				apt.doctorId === appointment.doctorId &&
				aptDateString === rescheduleDateString &&
				apt.requestedTime === rescheduleTime
			)
		})

		if (duplicateAppointment) {
			toast.error("You already have an appointment with this doctor at the same date and time. Please select a different date or time.")
			return
		}

		if (!window.confirm("Are you sure you want to request a reschedule for this appointment?")) {
			return
		}

		try {
			setIsSubmittingReschedule(true)
			const response = await appointmentsApi.requestReschedule(appointment.id, {
				newDate: rescheduleDate.toISOString(),
				newTime: rescheduleTime,
				reason: rescheduleReason.trim(),
			})

			if (response.success) {
				toast.success("Reschedule request sent successfully")
				onOpenChange(false)
				onSuccess()
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
						<DatePickerWithCalendar
							value={rescheduleDate}
							onChange={handleRescheduleDateChange}
							doctorAvailability={rescheduleDoctorAvailability}
							minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
							disabled={!appointment?.doctorId}
							placeholder="Select new date"
						/>
						<FieldDescription>
							Select a new date for your appointment (only available days are shown)
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
								<Select value={rescheduleTime} onValueChange={(value) => setRescheduleTime(value ?? "")}>
									<SelectTrigger>
										<SelectValue>{rescheduleTime ? undefined : "Choose a time slot"}</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{rescheduleAvailableTimes.map(time => (
											<SelectItem key={time} value={time}>
												{formatTime(time)}
											</SelectItem>
										))}
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
						onClick={() => onOpenChange(false)}
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
	)
}