import * as React from "react"
import { toast } from "sonner"
import type { AppointmentRequest } from "@/services/api/types"
import { appointmentsApi } from "@/features/appointments/api/appointments-api"

export function useAppointments() {
	const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([])
	const [isLoading, setIsLoading] = React.useState(true)

	const loadAppointments = React.useCallback(async () => {
		try {
			setIsLoading(true)
			const response = await appointmentsApi.getMyAppointments()

			if (response?.success && response.data) {
				if (response.data.items && Array.isArray(response.data.items)) {
					setAppointments(response.data.items)
				} else if (Array.isArray(response.data)) {
					setAppointments(response.data)
				} else {
					toast.error("Unexpected response format")
					setAppointments([])
				}
			} else {
				toast.error(response?.message || "Failed to load appointments")
				setAppointments([])
			}
		} catch (error) {
			console.error("Error loading appointments:", error)
			toast.error("An error occurred while loading appointments")
		} finally {
			setIsLoading(false)
		}
	}, [])

	const cancelAppointment = React.useCallback(
		async (appointmentId: string) => {
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
		},
		[loadAppointments]
	)

	const approveReschedule = React.useCallback(
		async (rescheduleId: string) => {
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
		},
		[loadAppointments]
	)

	const rejectReschedule = React.useCallback(
		async (rescheduleId: string) => {
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
		},
		[loadAppointments]
	)

	React.useEffect(() => {
		loadAppointments()
	}, [loadAppointments])

	return {
		appointments,
		isLoading,
		loadAppointments,
		cancelAppointment,
		approveReschedule,
		rejectReschedule,
	}
}