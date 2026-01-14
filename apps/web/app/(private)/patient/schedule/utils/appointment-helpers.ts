export const getStatusBadgeVariant = (status: string) => {
	switch (status) {
		case "CONFIRMED":
			return "default"
		case "PENDING":
			return "outline"
		case "REJECTED":
			return "destructive"
		case "CANCELLED":
			return "secondary"
		case "RESCHEDULED":
			return "secondary"
		default:
			return "outline"
	}
}

export const generateTimeSlots = (startTime: string, endTime: string): string[] => {
	const times: string[] = []
	const [startHour = NaN, startMin = NaN] = startTime.split(":").map(Number)
	const [endHour = NaN, endMin = NaN] = endTime.split(":").map(Number)

	if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
		return []
	}

	let currentHour = startHour
	let currentMin = startMin

	while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
		times.push(
			`${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`
		)
		currentMin += 30
		if (currentMin >= 60) {
			currentMin = 0
			currentHour += 1
		}
	}

	return times
}