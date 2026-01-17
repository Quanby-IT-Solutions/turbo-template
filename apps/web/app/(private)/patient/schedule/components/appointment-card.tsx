import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import type { AppointmentRequest, RescheduleRequest } from "@/services/api/types"
import { formatDate, formatTime } from "../utils/date-formatters"
import { getStatusBadgeVariant } from "../utils/appointment-helpers"

interface AppointmentCardProps {
	appointment: AppointmentRequest
	onCancel: (id: string) => void
	onReschedule: (appointment: AppointmentRequest) => void
	onApproveReschedule: (rescheduleId: string) => void
	onRejectReschedule: (rescheduleId: string) => void
	onClick: () => void
}

export function AppointmentCard({
	appointment,
	onCancel,
	onReschedule,
	onApproveReschedule,
	onRejectReschedule,
	onClick,
}: AppointmentCardProps) {
	const hasPendingReschedule = appointment.rescheduleRequests?.some(
		(req: RescheduleRequest) => req.status === "PENDING"
	)

	return (
		<Card
			className="hover:bg-accent/50 cursor-pointer transition-colors"
			onClick={onClick}
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
									.filter((req: RescheduleRequest) => req.status === "PENDING")
									.map((req: RescheduleRequest) => {
										const canApproveReject = req.requestedByRole !== "PATIENT"
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
																onApproveReschedule(req.id)
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
																onRejectReschedule(req.id)
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
					
					{(appointment.status === "PENDING" || appointment.status === "CONFIRMED") && (
						<div className="mt-4 flex flex-wrap gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={e => {
									e.stopPropagation()
									onCancel(appointment.id)
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
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}