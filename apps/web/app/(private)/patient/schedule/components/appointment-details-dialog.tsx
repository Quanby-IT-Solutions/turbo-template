import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Button } from "@/core/components/ui/button"
import { Badge } from "@/core/components/ui/badge"
import type { AppointmentRequest, RescheduleRequest } from "@/services/api/types"
import { formatDate, formatTime } from "../utils/date-formatters"
import { getStatusBadgeVariant } from "../utils/appointment-helpers"
import { AppointmentTimeline } from "./appointment-timeline"

interface AppointmentDetailsDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	appointment: AppointmentRequest | null
	onCancel: (id: string) => void
	onReschedule: (appointment: AppointmentRequest) => void
}

export function AppointmentDetailsDialog({
	open,
	onOpenChange,
	appointment,
	onCancel,
	onReschedule,
}: AppointmentDetailsDialogProps) {
	if (!appointment) return null

	const hasPendingReschedule = appointment.rescheduleRequests?.some(
		(req: RescheduleRequest) => req.status === "PENDING"
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Appointment Details</DialogTitle>
					<DialogDescription>Complete information about your appointment</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Doctor Information */}
					<div className="space-y-2">
						<h3 className="text-lg font-semibold">Doctor Information</h3>
						<div className="bg-muted/50 grid grid-cols-2 gap-4 rounded-lg p-4">
							<div>
								<p className="text-muted-foreground text-sm">Doctor Name</p>
								<p className="font-medium">
									{appointment.doctor?.doctorInfo
										? `Dr. ${appointment.doctor.doctorInfo.firstName} ${appointment.doctor.doctorInfo.lastName}`
										: "Unknown Doctor"}
								</p>
							</div>
							{appointment.doctor?.doctorInfo?.specialization && (
								<div>
									<p className="text-muted-foreground text-sm">Specialization</p>
									<p className="font-medium">{appointment.doctor.doctorInfo.specialization}</p>
								</div>
							)}
							{appointment.doctor?.email && (
								<div>
									<p className="text-muted-foreground text-sm">Email</p>
									<p className="font-medium">{appointment.doctor.email}</p>
								</div>
							)}
						</div>
					</div>

					{/* Appointment Timeline */}
					<div className="space-y-3">
						<h3 className="text-lg font-semibold">Appointment Timeline</h3>
						<div className="relative">
							<AppointmentTimeline appointment={appointment} />
						</div>
					</div>

					{/* Reason and Notes */}
					<div className="space-y-2">
						<h3 className="text-lg font-semibold">Reason & Notes</h3>
						<div className="bg-muted/50 space-y-3 rounded-lg p-4">
							<div>
								<p className="text-muted-foreground mb-1 text-sm">Reason for Visit</p>
								<p className="font-medium">{appointment.reason}</p>
							</div>
							{appointment.notes && (
								<div>
									<p className="text-muted-foreground mb-1 text-sm">Additional Notes</p>
									<p className="font-medium">{appointment.notes}</p>
								</div>
							)}
						</div>
					</div>

					{/* Reschedule Requests */}
					{appointment.rescheduleRequests && appointment.rescheduleRequests.length > 0 && (
						<div className="space-y-2">
							<h3 className="text-lg font-semibold">Reschedule History</h3>
							<div className="space-y-2">
								{appointment.rescheduleRequests.map((req: RescheduleRequest) => (
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
											<p className="text-muted-foreground text-xs">{formatDate(req.createdAt)}</p>
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
						{(appointment.status === "PENDING" || appointment.status === "CONFIRMED") && (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={e => {
										e.stopPropagation()
										onCancel(appointment.id)
										onOpenChange(false)
									}}
									className="text-destructive hover:text-destructive"
								>
									Cancel Appointment
								</Button>
								{appointment.status === "CONFIRMED" && (
									<Button
										variant="secondary"
										size="sm"
										onClick={e => {
											e.stopPropagation()
											onReschedule(appointment)
											onOpenChange(false)
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
								)}
							</>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}