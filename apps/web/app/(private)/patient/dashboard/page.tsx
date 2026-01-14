"use client"

import * as React from "react"
import Link from "next/link"
import { IconCalendarPlus } from "@tabler/icons-react"
import { toast } from "sonner"

import { ChartAreaInteractive } from "@/core/components/chart-area-interactive"
import { PatientDashboardCards } from "@/core/components/patient-dashboard-cards"
import { RoleHeader } from "@/core/components/role-header"
import { SectionCards } from "@/core/components/section-cards"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar"
import { Skeleton } from "@/core/components/ui/skeleton"
import type { AppointmentRequest } from "@/services/api/types"
import { appointmentsApi } from "@/features/appointments/api/appointments-api"

const faceScanSelfCheckSeed = [
	{
		id: "face-scan-1",
		label: "Face scan self-check",
		description: "Pulse 72 bpm · Stress low",
		timestamp: "Today · 7:45 AM",
	},
	{
		id: "face-scan-2",
		label: "Face scan self-check",
		description: "Pulse 76 bpm · Stress moderate",
		timestamp: "Yesterday · 8:10 PM",
	},
	{
		id: "face-scan-3",
		label: "Face scan self-check",
		description: "Pulse 71 bpm · Stress low",
		timestamp: "Yesterday · 6:30 PM",
	},
]

const getDoctorName = (appointment?: AppointmentRequest["doctor"]) => {
	if (!appointment) return "Assigned doctor"
	const info = appointment.doctorInfo
	if (info?.firstName || info?.lastName) {
		return [info.firstName, info.lastName].filter(Boolean).join(" ")
	}
	return appointment.email || "Assigned doctor"
}

const formatAppointmentDate = (date?: string) => {
	if (!date) return "To be scheduled"
	return new Date(date).toLocaleDateString(undefined, {
		weekday: "long",
		month: "short",
		day: "numeric",
	})
}

const formatAppointmentTime = (time?: string) => {
	if (!time) return "Time TBD"
	try {
		const [hours, minutes] = time.split(":").map(Number)
		const date = new Date()
		date.setHours(hours, minutes || 0, 0, 0)
		return date.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
		})
	} catch {
		return time
	}
}

export default function PatientDashboardPage() {
	const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([])
	const [isLoadingAppointments, setIsLoadingAppointments] = React.useState(true)
	const [stats, setStats] = React.useState({
		upcomingAppointments: 0,
		pendingRequests: 0,
		completedVisits: 0,
	})

	React.useEffect(() => {
		const loadAppointments = async () => {
			try {
				setIsLoadingAppointments(true)
				const response = await appointmentsApi.getMyAppointments({ limit: 20 })

				if (response.success && response.data) {
					// Access the items array from the response
					const data = response.data.items || [] // Changed this line
					const now = new Date()
					const startOfToday = new Date(now)
					startOfToday.setHours(0, 0, 0, 0)

					const upcoming = data.filter(
						(apt: { requestedDate: string | number | Date; status: string }) => {
							const aptDate = new Date(apt.requestedDate)
							return apt.status === "CONFIRMED" && aptDate >= startOfToday
						}
					)

					const withinWeek = new Date(startOfToday)
					withinWeek.setDate(withinWeek.getDate() + 7)

					setStats({
						upcomingAppointments: upcoming.filter(
							(apt: { requestedDate: string | number | Date }) => {
								const date = new Date(apt.requestedDate)
								return date <= withinWeek
							}
						).length,
						pendingRequests: data.filter((apt: { status: string }) => apt.status === "PENDING")
							.length,
						completedVisits: data.filter((apt: { consultation: any }) => apt.consultation).length,
					})

					// Sort by soonest upcoming date
					const sorted = [...data].sort((a, b) => {
						const dateA = new Date(a.requestedDate).getTime()
						const dateB = new Date(b.requestedDate).getTime()
						return dateA - dateB
					})

					setAppointments(sorted)
				} else {
					toast.error(response.message || "Unable to load appointments")
				}
			} catch (error) {
				console.error("Failed to load appointments", error)
				toast.error("Failed to load your appointments")
			} finally {
				setIsLoadingAppointments(false)
			}
		}

		loadAppointments()
	}, [])

	const upcomingAppointments = React.useMemo(() => {
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		return appointments.filter(apt => {
			const aptDate = new Date(apt.requestedDate)
			return aptDate >= today
		})
	}, [appointments])

	const nextAppointment = upcomingAppointments[0]
	const recentMeetHistory = React.useMemo(() => {
		return [...appointments]
			.filter(apt => apt.consultation || apt.status === "CONFIRMED")
			.sort((a, b) => {
				const dateA = new Date(a.requestedDate).getTime()
				const dateB = new Date(b.requestedDate).getTime()
				return dateB - dateA
			})
			.slice(0, 3)
	}, [appointments])

	const faceScanHistory = React.useMemo(() => {
		return faceScanSelfCheckSeed.slice(0, 3)
	}, [])

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
				<RoleHeader
					title="Dashboard"
					description="See what’s next, review recent activity, and jump into the tasks that keep you feeling your best."
				/>
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
							{/* Dashboard-01 style metric cards */}
							<SectionCards
								cards={[
									{
										title: "Upcoming Appointments",
										value: stats.upcomingAppointments.toString(),
										trend: {
											value: stats.upcomingAppointments > 0 ? "Scheduled" : "None",
											direction: "up",
										},
										footer: {
											label: `${stats.upcomingAppointments} appointment${stats.upcomingAppointments !== 1 ? "s" : ""} coming up`,
											description: "Within the next 7 days",
										},
									},
									{
										title: "Pending Requests",
										value: stats.pendingRequests.toString(),
										trend: {
											value: stats.pendingRequests > 0 ? "Awaiting" : "All clear",
											direction: stats.pendingRequests > 0 ? "up" : "up",
										},
										footer: {
											label: `${stats.pendingRequests} request${stats.pendingRequests !== 1 ? "s" : ""} pending confirmation`,
											description: "Waiting for doctor approval",
										},
									},
									{
										title: "Completed Visits",
										value: stats.completedVisits.toString(),
										trend: {
											value: "Completed",
											direction: "up",
										},
										footer: {
											label: `${stats.completedVisits} consultation${stats.completedVisits !== 1 ? "s" : ""} completed`,
											description: "Total visits with your doctor",
										},
									},
									{
										title: "Health Status",
										value: "Active",
										trend: {
											value: "Good",
											direction: "up",
										},
										footer: {
											label: "Keep up your health monitoring",
											description: "Regular check-ins recommended",
										},
									},
								]}
							/>

							{/* Legacy dashboard cards - keep for additional info */}
							<PatientDashboardCards stats={stats} />

							{/* Chart section - dashboard-01 style */}
							<div className="px-4 lg:px-6">
								<ChartAreaInteractive />
							</div>

							<div className="px-4 lg:px-6">
								<Card>
									<CardHeader>
										<CardTitle>Your next appointment</CardTitle>
										<CardDescription>
											Know exactly when to be ready and who you’re meeting with.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-5">
										{isLoadingAppointments ? (
											<div className="space-y-3">
												<Skeleton className="h-6 w-1/3" />
												<Skeleton className="h-4 w-1/2" />
												<Skeleton className="h-4 w-1/4" />
											</div>
										) : nextAppointment ? (
											<div className="bg-muted/40 rounded-lg border p-4">
												<p className="text-muted-foreground text-xs tracking-wide uppercase">
													Next visit
												</p>
												<p className="text-xl font-semibold">
													{formatAppointmentDate(nextAppointment.requestedDate)}
												</p>
												<p className="text-muted-foreground text-sm">
													{formatAppointmentTime(nextAppointment.requestedTime)} ·{" "}
													{getDoctorName(nextAppointment.doctor)}
												</p>
												<p className="text-muted-foreground text-sm">
													{nextAppointment.reason || "Virtual consultation"}
												</p>
											</div>
										) : (
											<div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
												<p>No visits booked yet. Schedule one when you’re ready.</p>
											</div>
										)}

										{!isLoadingAppointments && upcomingAppointments.length > 1 && (
											<div>
												<p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
													Coming up next
												</p>
												<div className="space-y-3">
													{upcomingAppointments.slice(1, 4).map(appointment => (
														<div
															key={appointment.id}
															className="bg-muted/20 flex items-center justify-between rounded-md border px-3 py-2 text-sm"
														>
															<div>
																<p className="font-medium">
																	{formatAppointmentDate(appointment.requestedDate)}
																</p>
																<p className="text-muted-foreground text-xs">
																	{formatAppointmentTime(appointment.requestedTime)} ·{" "}
																	{getDoctorName(appointment.doctor)}
																</p>
															</div>
															<span className="text-muted-foreground text-xs capitalize">
																{appointment.status.toLowerCase()}
															</span>
														</div>
													))}
												</div>
											</div>
										)}

										<div className="flex flex-col gap-3 md:flex-row">
											<Button asChild className="flex-1">
												<Link href="/patient/schedule">
													<IconCalendarPlus className="mr-2 size-4" />
													Book a visit
												</Link>
											</Button>
										</div>
									</CardContent>
								</Card>
							</div>

							<div className="px-4 lg:px-6">
								<Card>
									<CardHeader>
										<CardTitle>Recent check-ins</CardTitle>
										<CardDescription>
											Meet history and self-check logs in one glance.
										</CardDescription>
									</CardHeader>
									<CardContent className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-3">
											<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
												Meet history
											</p>
											{isLoadingAppointments ? (
												<Skeleton className="h-24 rounded-lg" />
											) : recentMeetHistory.length ? (
												recentMeetHistory.map(appointment => (
													<div
														key={appointment.id}
														className="bg-muted/30 rounded-lg border p-3 text-sm"
													>
														<p className="font-semibold">
															{formatAppointmentDate(appointment.requestedDate)}
														</p>
														<p className="text-muted-foreground text-xs">
															{formatAppointmentTime(appointment.requestedTime)} ·{" "}
															{getDoctorName(appointment.doctor)}
														</p>
														{appointment.reason && (
															<p className="text-muted-foreground mt-1 text-xs">
																{appointment.reason}
															</p>
														)}
													</div>
												))
											) : (
												<div className="text-muted-foreground rounded-lg border border-dashed p-4 text-xs">
													Completed visits will appear here after each call.
												</div>
											)}
										</div>

										<div className="space-y-3">
											<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
												Face scan self-checks
											</p>
											{faceScanHistory.map(entry => (
												<div key={entry.id} className="bg-muted/30 rounded-lg border p-3 text-sm">
													<p className="font-semibold">{entry.label}</p>
													<p className="text-muted-foreground text-xs">{entry.description}</p>
													<p className="text-muted-foreground mt-2 text-xs">{entry.timestamp}</p>
												</div>
											))}
										</div>
									</CardContent>
									<CardFooter className="text-muted-foreground justify-between text-xs">
										<span>Showing the latest three updates for each list</span>
										<Link href="/patient/self-check" className="font-medium hover:underline">
											Add a new note
										</Link>
									</CardFooter>
								</Card>
							</div>
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
