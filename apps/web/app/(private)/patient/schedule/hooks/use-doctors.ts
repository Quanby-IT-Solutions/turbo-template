import * as React from "react"
import { toast } from "sonner"
import { appointmentsApi } from "@/features/appointments/api/appointments-api"

export function useDoctors(shouldLoad: boolean) {
	const [doctors, setDoctors] = React.useState<
		Array<{ id: string; name: string; specialization: string }>
	>([])
	const [isLoading, setIsLoading] = React.useState(false)

	React.useEffect(() => {
		if (!shouldLoad) return

		const loadDoctors = async () => {
			try {
				setIsLoading(true)
				const response = await appointmentsApi.getAvailableDoctors()
				if (response.success && response.data) {
					setDoctors(response.data)
				} else {
					toast.error(response.message || "Failed to load doctors")
				}
			} catch (error) {
				toast.error("An error occurred while loading doctors")
				console.error("Error loading doctors:", error)
			} finally {
				setIsLoading(false)
			}
		}

		loadDoctors()
	}, [shouldLoad])

	return { doctors, isLoading }
}