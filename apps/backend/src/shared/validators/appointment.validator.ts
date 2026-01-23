import { BadRequestException } from "@nestjs/common"

interface OrganizationSettings {
	clinicStartTime: string
	clinicEndTime: string
	breakStartTime?: string | null
	breakEndTime?: string | null
	appointmentSlotDuration: number
	maxAppointmentsPerSlot: number
	bookingWindowDays: number
	minAdvanceBookingHours: number
	workingDays: string[]
}

/**
 * Validates appointment time against organization settings
 */
export class AppointmentValidator {
	/**
	 * Validate if appointment date/time is within clinic hours
	 */
	static validateClinicHours(
		requestedDate: Date,
		requestedTime: string,
		settings: OrganizationSettings
	): void {
		// Check if day is a working day
		const dayName = this.getDayName(requestedDate)
		if (!settings.workingDays.includes(dayName)) {
			throw new BadRequestException(
				`Appointments are not available on ${dayName}. Working days: ${settings.workingDays.join(", ")}`
			)
		}

		// Parse times (format: "HH:MM" or "HH:MM:SS")
		const appointmentTime = this.parseTime(requestedTime)
		const clinicStart = this.parseTime(settings.clinicStartTime)
		const clinicEnd = this.parseTime(settings.clinicEndTime)

		// Check if appointment is within clinic hours
		if (appointmentTime < clinicStart || appointmentTime >= clinicEnd) {
			throw new BadRequestException(
				`Appointment time must be between ${settings.clinicStartTime.substring(0, 5)} and ${settings.clinicEndTime.substring(0, 5)}`
			)
		}

		// Check if appointment is during break time
		if (settings.breakStartTime && settings.breakEndTime) {
			const breakStart = this.parseTime(settings.breakStartTime)
			const breakEnd = this.parseTime(settings.breakEndTime)

			if (appointmentTime >= breakStart && appointmentTime < breakEnd) {
				throw new BadRequestException(
					`Appointments are not available during break time (${settings.breakStartTime.substring(0, 5)} - ${settings.breakEndTime.substring(0, 5)})`
				)
			}
		}
	}

	/**
	 * Validate booking window (how far in advance can book)
	 */
	static validateBookingWindow(requestedDate: Date, settings: OrganizationSettings): void {
		const now = new Date()
		const maxDate = new Date()
		maxDate.setDate(maxDate.getDate() + settings.bookingWindowDays)

		if (requestedDate > maxDate) {
			throw new BadRequestException(
				`Appointments can only be booked ${settings.bookingWindowDays} days in advance`
			)
		}

		// Check minimum advance booking hours
		const hoursUntilAppointment = (requestedDate.getTime() - now.getTime()) / (1000 * 60 * 60)
		if (hoursUntilAppointment < settings.minAdvanceBookingHours) {
			throw new BadRequestException(
				`Appointments must be booked at least ${settings.minAdvanceBookingHours} hours in advance`
			)
		}

		// Don't allow booking in the past
		if (requestedDate < now) {
			throw new BadRequestException("Cannot book appointments in the past")
		}
	}

	/**
	 * Validate appointment time aligns with slot duration
	 */
	static validateSlotAlignment(requestedTime: string, settings: OrganizationSettings): void {
		const time = this.parseTime(requestedTime)
		const clinicStart = this.parseTime(settings.clinicStartTime)
		
		// Calculate minutes since clinic start
		const minutesSinceStart = time - clinicStart

		// Check if it aligns with slot duration
		if (minutesSinceStart % settings.appointmentSlotDuration !== 0) {
			throw new BadRequestException(
				`Appointment times must align with ${settings.appointmentSlotDuration}-minute slots. ` +
				`Please choose a time that is a multiple of ${settings.appointmentSlotDuration} minutes from ${settings.clinicStartTime.substring(0, 5)}`
			)
		}
	}

	/**
	 * Get day name from date (MONDAY, TUESDAY, etc.)
	 */
	private static getDayName(date: Date): string {
		const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
		return days[date.getDay()] || "SUNDAY"
	}

	/**
	 * Parse time string (HH:MM or HH:MM:SS) to minutes since midnight
	 */
	private static parseTime(timeString: string): number {
		const parts = timeString.split(":")
		const hours = parseInt(parts[0] || "0", 10)
		const minutes = parseInt(parts[1] || "0", 10)
		return hours * 60 + minutes
	}

	/**
	 * Validate complete appointment request
	 */
	static validateAppointment(
		requestedDate: Date,
		requestedTime: string,
		settings: OrganizationSettings
	): void {
		this.validateBookingWindow(requestedDate, settings)
		this.validateClinicHours(requestedDate, requestedTime, settings)
		this.validateSlotAlignment(requestedTime, settings)
	}
}
