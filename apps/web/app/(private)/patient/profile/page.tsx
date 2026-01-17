"use client"

import * as React from "react"
import { toast } from "sonner"
import { RoleHeader } from "@/core/components/role-header"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar"
import { authApi } from "@/features/auth/api/auth-api"
import { patientsApi } from "@/features/patients/api/patients-api"
import type { User } from "@/services/api/types"
import type { PatientInfoType } from "@/features/patients/types/patients-types"
import { PersonalInfoCard } from "./components/cards/personal-info-card"
import { PhilHealthInfoCard } from "./components/cards/philhealth-info-card"
import { SystemInfoCard } from "./components/cards/system-info-card"
import { LoadingPage } from "./components/loading/loading-page"

export default function ProfilePage() {
	const [user, setUser] = React.useState<User | null>(null)
	const [loading, setLoading] = React.useState(true)
	const [patientInfo, setPatientInfo] = React.useState<PatientInfoType | null>(null)

	React.useEffect(() => {
		fetchProfile()
	}, [])

	const fetchProfile = async () => {
		setLoading(true)
		try {
			const response = await authApi.getProfile()
			if (response.success && response.data) {
				setUser(response.data)
				if (response.data.id) {
					await fetchPatientInfo(response.data.id)
				}
			} else {
				toast.error(response.message || "Failed to fetch profile")
			}
		} catch (error) {
			toast.error("An error occurred while fetching profile")
			console.error("Error fetching profile:", error)
		} finally {
			setLoading(false)
		}
	}

	const fetchPatientInfo = async (patientId: string) => {
		try {
			const response = await patientsApi.getPatientById(patientId)
			if (response.success && response.data) {
				setPatientInfo(response.data.patientInfo ?? null)
			} else {
				toast.error(response.message || "Failed to fetch patient info")
			}
		} catch (error) {
			toast.error("An error occurred while fetching patient info")
			console.error("Error fetching patient info:", error)
		}
	}

	if (loading) {
		return <LoadingPage />
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
				<RoleHeader title="My Profile" description="Manage your personal information" />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
							<div className="px-4 lg:px-6">
								<PersonalInfoCard
									user={user}
									patientInfo={patientInfo}
									onRefresh={fetchProfile}
								/>
								<PhilHealthInfoCard
									user={user}
									patientInfo={patientInfo}
									onRefresh={fetchProfile}
								/>
								<SystemInfoCard user={user} patientInfo={patientInfo} />
							</div>
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
