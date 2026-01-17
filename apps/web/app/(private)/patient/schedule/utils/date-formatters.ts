export const formatDate = (dateString: string) => {
	const date = new Date(dateString)
	return date.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	})
}

export const formatTime = (timeString: string) => {
	const [hours = "0", minutes = "0"] = timeString.split(":")
	const hour = parseInt(hours)
	const ampm = hour >= 12 ? "PM" : "AM"
	const displayHour = hour % 12 || 12
	return `${displayHour}:${minutes} ${ampm}`
}

export const getMinDate = () => {
	const tomorrow = new Date()
	tomorrow.setDate(tomorrow.getDate() + 1)
	return tomorrow.toISOString().split("T")[0]
}