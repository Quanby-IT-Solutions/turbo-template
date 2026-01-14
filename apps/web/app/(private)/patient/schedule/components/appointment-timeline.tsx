import { Badge } from "@/core/components/ui/badge"
import type { AppointmentRequest, RescheduleRequest } from "@/services/api/types"
import { formatDate, formatTime } from "../utils/date-formatters"
import { getStatusBadgeVariant } from "../utils/appointment-helpers"

interface AppointmentTimelineProps {
	appointment: AppointmentRequest
}

export function AppointmentTimeline({ appointment }: AppointmentTimelineProps) {
	const approvedReschedule = appointment.rescheduleRequests?.find(
		(req: RescheduleRequest) => req.status === "APPROVED"
	)
	const hasOriginalDate =
		approvedReschedule && approvedReschedule.currentDate && approvedReschedule.currentTime
	const isRescheduled = appointment.status === "RESCHEDULED"

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
		value: `${formatDate(appointment.createdAt)} at ${formatTime(new Date(appointment.createdAt).toTimeString().slice(0, 5))}`,
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
		appointment.status === "CONFIRMED"
			? "bg-green-500 border-green-500 text-white"
			: appointment.status === "PENDING"
				? "bg-orange-500 border-orange-500 text-white"
				: appointment.status === "CANCELLED" || appointment.status === "REJECTED"
					? "bg-red-500 border-red-500 text-white"
					: isRescheduled
						? "bg-purple-500 border-purple-500 text-white"
						: "bg-muted border-muted text-muted-foreground"

	steps.push({
		number: stepNumber,
		label: isRescheduled ? "RESCHEDULED DATE & TIME" : "SCHEDULED DATE & TIME",
		value: `${formatDate(appointment.requestedDate)} at ${formatTime(appointment.requestedTime)}`,
		description: isRescheduled ? "Appointment rescheduled" : "Appointment scheduled",
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
						{step.showConnector && <div className="bg-muted mt-2 h-full min-h-16 w-0.5"></div>}
					</div>
					<div className={`flex-1 ${step.showConnector ? "pb-6" : ""}`}>
						<div className="space-y-1">
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								{step.label}
							</p>
							<p
								className={`text-base font-semibold ${
									step.number === (isRescheduled && hasOriginalDate ? 3 : 2) && isRescheduled
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
												variant={getStatusBadgeVariant(appointment.status)}
												className="text-sm"
											>
												{appointment.status}
											</Badge>
										</div>
									</div>
									<div className="space-y-1">
										<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
											PRIORITY
										</p>
										<p className="text-base font-semibold capitalize">
											{appointment.priority.toLowerCase()}
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
}