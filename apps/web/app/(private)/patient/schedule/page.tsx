"use client"

import * as React from "react"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { RoleHeader } from "@/core/components/role-header"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar"

// Import custom components
import { AppointmentCard } from "./components/appointment-card"
import { AppointmentFilters } from "./components/appointment-filters"
import { BookingDialog } from "./components/booking-dialog"
import { Pagination } from "./components/pagination"
import { RescheduleDialog } from "./components/reschedule-dialog"
import { AppointmentDetailsDialog } from "./components/appointment-details-dialog"

// Import custom hooks
import { useAppointments } from "./hooks/use-appointments"
import { useDoctors } from "./hooks/use-doctors"

export default function SchedulePage() {
	const [isBookingOpen, setIsBookingOpen] = React.useState(false)
	const [filterStatus, setFilterStatus] = React.useState("all")
	const [sortBy, setSortBy] = React.useState<"most-recent" | "appointment-date-asc" | "appointment-date-desc">("most-recent")
	const [currentPage, setCurrentPage] = React.useState(1)
	const [selectedAppointment, setSelectedAppointment] = React.useState<any>(null)
	const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false)
	const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = React.useState(false)
	const [rescheduleAppointment, setRescheduleAppointment] = React.useState<any>(null)
	
	const itemsPerPage = 10

	// Use custom hooks for data management
	const {
		appointments,
		isLoading,
		loadAppointments,
		cancelAppointment,
		approveReschedule,
		rejectReschedule,
	} = useAppointments()

	const { doctors } = useDoctors(isBookingOpen)

	// Filter and sort appointments
	const filteredAppointments = React.useMemo(() => {
		// Create a copy of the filtered array to avoid mutating the original
		const filtered = filterStatus === "all" 
			? [...appointments]
			: [...appointments.filter(apt => apt.status === filterStatus.toUpperCase())]
		
		// Apply sorting based on selected sort option
		return filtered.sort((a, b) => {
			if (sortBy === "most-recent") {
				// Sort by createdAt in descending order (newest first)
				const dateA = new Date(a.createdAt).getTime()
				const dateB = new Date(b.createdAt).getTime()
				// Handle invalid dates
				if (isNaN(dateA) || isNaN(dateB)) {
					return isNaN(dateA) ? 1 : -1
				}
				return dateB - dateA
			} else {
				// Sort by appointment date and time
				// Handle time format - ensure it's in HH:MM format
				const timeA = a.requestedTime?.includes(":") ? a.requestedTime : a.requestedTime ? `${a.requestedTime.slice(0, 2)}:${a.requestedTime.slice(2)}` : "00:00"
				const timeB = b.requestedTime?.includes(":") ? b.requestedTime : b.requestedTime ? `${b.requestedTime.slice(0, 2)}:${b.requestedTime.slice(2)}` : "00:00"
				
				// Parse date and time together
				const dateStrA = a.requestedDate ? `${a.requestedDate.split("T")[0]}T${timeA}` : ""
				const dateStrB = b.requestedDate ? `${b.requestedDate.split("T")[0]}T${timeB}` : ""
				
				const dateA = dateStrA ? new Date(dateStrA).getTime() : 0
				const dateB = dateStrB ? new Date(dateStrB).getTime() : 0
				
				// Handle invalid dates
				if (isNaN(dateA) || isNaN(dateB)) {
					return isNaN(dateA) ? 1 : -1
				}
				
				return sortBy === "appointment-date-asc" ? dateA - dateB : dateB - dateA
			}
		})
	}, [appointments, filterStatus, sortBy])

	// Reset to page 1 when filter or sort changes
	React.useEffect(() => {
		setCurrentPage(1)
	}, [filterStatus, sortBy])

	// Pagination calculations
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

	// Get status counts
	const statusCounts = React.useMemo(
		() => ({
			all: appointments.length,
			pending: appointments.filter(a => a.status === "PENDING").length,
			confirmed: appointments.filter(a => a.status === "CONFIRMED").length,
			cancelled: appointments.filter(a => a.status === "CANCELLED").length,
			rescheduled: appointments.filter(a => a.status === "RESCHEDULED").length,
		}),
		[appointments]
	)

	const handleReschedule = (appointment: any) => {
		const hasPendingReschedule = appointment.rescheduleRequests?.some(
			(req: any) => req.status === "PENDING"
		)
		if (hasPendingReschedule) {
			// The check is already in the component, so just set state
			return
		}
		setRescheduleAppointment(appointment)
		setIsRescheduleDialogOpen(true)
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
									<AppointmentFilters
										filterStatus={filterStatus}
										onFilterChange={setFilterStatus}
										sortBy={sortBy}
										onSortChange={setSortBy}
										statusCounts={statusCounts}
									>
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
														<AppointmentCard
															key={appointment.id}
															appointment={appointment}
															onCancel={cancelAppointment}
															onReschedule={handleReschedule}
															onApproveReschedule={approveReschedule}
															onRejectReschedule={rejectReschedule}
															onClick={() => {
																setSelectedAppointment(appointment)
																setIsDetailsDialogOpen(true)
															}}
														/>
													))}
												</div>

												<Pagination
													currentPage={currentPage}
													totalPages={totalPages}
													startIndex={startIndex}
													endIndex={endIndex}
													totalItems={filteredAppointments.length}
													onPageChange={goToPage}
												/>
											</>
										)}
									</AppointmentFilters>
								)}
							</div>
						</div>
					</div>
				</div>
			</SidebarInset>

			{/* Dialogs */}
			<BookingDialog
				open={isBookingOpen}
				onOpenChange={setIsBookingOpen}
				doctors={doctors}
				existingAppointments={appointments}
				onSuccess={loadAppointments}
			/>

			<RescheduleDialog
				open={isRescheduleDialogOpen}
				onOpenChange={setIsRescheduleDialogOpen}
				appointment={rescheduleAppointment}
				existingAppointments={appointments}
				onSuccess={loadAppointments}
			/>

			<AppointmentDetailsDialog
				open={isDetailsDialogOpen}
				onOpenChange={setIsDetailsDialogOpen}
				appointment={selectedAppointment}
				onCancel={cancelAppointment}
				onReschedule={handleReschedule}
			/>
		</SidebarProvider>
	)
}