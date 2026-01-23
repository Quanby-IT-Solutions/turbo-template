import { Injectable, NotFoundException, BadRequestException, Inject } from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import { doctorSchedules, users, doctorInfos, organizationSettings } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class DoctorSchedulesService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll(doctorId?: string, dayOfWeek?: string) {
		const conditions = []

		if (doctorId) {
			conditions.push(eq(doctorSchedules.doctorId, doctorId))
		}
		if (dayOfWeek) {
			conditions.push(eq(doctorSchedules.dayOfWeek, dayOfWeek.toUpperCase()))
		}

		const schedules = await this.db
			.select({
				id: doctorSchedules.id,
				doctorId: doctorSchedules.doctorId,
				dayOfWeek: doctorSchedules.dayOfWeek,
				startTime: doctorSchedules.startTime,
				endTime: doctorSchedules.endTime,
				isAvailable: doctorSchedules.isAvailable,
				doctor: {
					id: users.id,
					name: users.name,
					email: users.email,
					specialization: doctorInfos.specialization,
				},
			})
			.from(doctorSchedules)
			.leftJoin(users, eq(doctorSchedules.doctorId, users.id))
			.leftJoin(doctorInfos, eq(users.id, doctorInfos.userId))
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(doctorSchedules.dayOfWeek)

		return schedules.map((schedule) => ({
			id: schedule.id,
			doctorId: schedule.doctorId,
			doctorName: schedule.doctor?.name || "Unknown",
			doctorEmail: schedule.doctor?.email,
			specialization: schedule.doctor?.specialization,
			dayOfWeek: schedule.dayOfWeek,
			startTime: schedule.startTime,
			endTime: schedule.endTime,
			isAvailable: schedule.isAvailable,
		}))
	}

	async findOne(id: string) {
		const [schedule] = await this.db
			.select({
				id: doctorSchedules.id,
				doctorId: doctorSchedules.doctorId,
				dayOfWeek: doctorSchedules.dayOfWeek,
				startTime: doctorSchedules.startTime,
				endTime: doctorSchedules.endTime,
				isAvailable: doctorSchedules.isAvailable,
				doctor: {
					id: users.id,
					name: users.name,
					email: users.email,
					specialization: doctorInfos.specialization,
				},
			})
			.from(doctorSchedules)
			.leftJoin(users, eq(doctorSchedules.doctorId, users.id))
			.leftJoin(doctorInfos, eq(users.id, doctorInfos.userId))
			.where(eq(doctorSchedules.id, id))
			.limit(1)

		if (!schedule) {
			throw new NotFoundException("Doctor schedule not found")
		}

		return {
			id: schedule.id,
			doctorId: schedule.doctorId,
			doctorName: schedule.doctor?.name || "Unknown",
			doctorEmail: schedule.doctor?.email,
			specialization: schedule.doctor?.specialization,
			dayOfWeek: schedule.dayOfWeek,
			startTime: schedule.startTime,
			endTime: schedule.endTime,
			isAvailable: schedule.isAvailable,
		}
	}

	async create(data: {
		doctorId: string
		dayOfWeek: string
		startTime: string
		endTime: string
		isAvailable: boolean
	}) {
		// Verify doctor exists and is a doctor role
		const [doctor] = await this.db
			.select()
			.from(users)
			.where(and(eq(users.id, data.doctorId), eq(users.role, "DOCTOR" as const)))
			.limit(1)

		if (!doctor) {
			throw new BadRequestException("Doctor not found")
		}

		// Get organization settings to validate against clinic hours and working days
		if (doctor.organizationId) {
			const [orgSettings] = await this.db
				.select()
				.from(organizationSettings)
				.where(eq(organizationSettings.organizationId, doctor.organizationId))
				.limit(1)

			if (orgSettings) {
				// Validate day of week against working days
				const workingDays = (orgSettings.workingDays as string[]) || []
				if (!workingDays.includes(data.dayOfWeek.toUpperCase())) {
					throw new BadRequestException(
						`${data.dayOfWeek} is not a working day for this organization. Working days: ${workingDays.join(", ")}`
					)
				}

				// Validate time against clinic hours
				const scheduleStart = this.parseTimeToTimestamp(data.startTime)
				const scheduleEnd = this.parseTimeToTimestamp(data.endTime)
				const clinicStart = this.parseTimeString(orgSettings.clinicStartTime)
				const clinicEnd = this.parseTimeString(orgSettings.clinicEndTime)

				if (scheduleStart < clinicStart) {
					throw new BadRequestException(
						`Schedule start time (${data.startTime}) is before clinic opening time (${orgSettings.clinicStartTime})`
					)
				}

				if (scheduleEnd > clinicEnd) {
					throw new BadRequestException(
						`Schedule end time (${data.endTime}) is after clinic closing time (${orgSettings.clinicEndTime})`
					)
				}
			}
		}

		// Check if schedule already exists for this doctor and day
		const [existing] = await this.db
			.select()
			.from(doctorSchedules)
			.where(
				and(
					eq(doctorSchedules.doctorId, data.doctorId),
					eq(doctorSchedules.dayOfWeek, data.dayOfWeek.toUpperCase())
				)
			)
			.limit(1)

		if (existing) {
			throw new BadRequestException(
				`Schedule already exists for this doctor on ${data.dayOfWeek}`
			)
		}

		// Validate time format and convert to timestamp
		const startTime = this.parseTimeToTimestamp(data.startTime)
		const endTime = this.parseTimeToTimestamp(data.endTime)

		if (startTime >= endTime) {
			throw new BadRequestException("End time must be after start time")
		}

		const [schedule] = await this.db
			.insert(doctorSchedules)
			.values({
				doctorId: data.doctorId,
				dayOfWeek: data.dayOfWeek.toUpperCase(),
				startTime,
				endTime,
				isAvailable: data.isAvailable ?? true,
			})
			.returning()

		if (!schedule) {
			throw new BadRequestException("Failed to create schedule")
		}

		return this.findOne(schedule.id)
	}

	async update(
		id: string,
		data: {
			dayOfWeek?: string
			startTime?: string
			endTime?: string
			isAvailable?: boolean
		}
	) {
		const existing = await this.findOne(id)

		// Get doctor info for organization validation
		const [doctor] = await this.db
			.select()
			.from(users)
			.where(eq(users.id, existing.doctorId))
			.limit(1)

		const updateData: any = {}

		if (data.dayOfWeek !== undefined) {
			updateData.dayOfWeek = data.dayOfWeek.toUpperCase()
		}
		if (data.startTime !== undefined) {
			updateData.startTime = this.parseTimeToTimestamp(data.startTime)
		}
		if (data.endTime !== undefined) {
			updateData.endTime = this.parseTimeToTimestamp(data.endTime)
		}
		if (data.isAvailable !== undefined) {
			updateData.isAvailable = data.isAvailable
		}

		// Validate times if both are being updated or if one is updated with existing other
		const finalStartTime =
			updateData.startTime || this.parseTimeToTimestamp(existing.startTime as any)
		const finalEndTime =
			updateData.endTime || this.parseTimeToTimestamp(existing.endTime as any)

		if (finalStartTime >= finalEndTime) {
			throw new BadRequestException("End time must be after start time")
		}

		// Validate against organization settings
		if (doctor && doctor.organizationId) {
			const [orgSettings] = await this.db
				.select()
				.from(organizationSettings)
				.where(eq(organizationSettings.organizationId, doctor.organizationId))
				.limit(1)

			if (orgSettings) {
				// Validate day of week if being updated
				const finalDayOfWeek = updateData.dayOfWeek || existing.dayOfWeek
				const workingDays = (orgSettings.workingDays as string[]) || []
				if (!workingDays.includes(finalDayOfWeek.toUpperCase())) {
					throw new BadRequestException(
						`${finalDayOfWeek} is not a working day for this organization. Working days: ${workingDays.join(", ")}`
					)
				}

				// Validate time against clinic hours
				const clinicStart = this.parseTimeString(orgSettings.clinicStartTime)
				const clinicEnd = this.parseTimeString(orgSettings.clinicEndTime)

				if (finalStartTime < clinicStart) {
					const startTimeStr = data.startTime || this.formatTime(existing.startTime as any)
					throw new BadRequestException(
						`Schedule start time (${startTimeStr}) is before clinic opening time (${orgSettings.clinicStartTime})`
					)
				}

				if (finalEndTime > clinicEnd) {
					const endTimeStr = data.endTime || this.formatTime(existing.endTime as any)
					throw new BadRequestException(
						`Schedule end time (${endTimeStr}) is after clinic closing time (${orgSettings.clinicEndTime})`
					)
				}
			}
		}

		await this.db.update(doctorSchedules).set(updateData).where(eq(doctorSchedules.id, id))

		return this.findOne(id)
	}

	async delete(id: string) {
		const schedule = await this.findOne(id)

		await this.db.delete(doctorSchedules).where(eq(doctorSchedules.id, id))

		return { id: schedule.id }
	}

	private parseTimeToTimestamp(timeString: string | Date): Date {
		if (timeString instanceof Date) {
			return timeString
		}

		// Handle ISO timestamp strings
		if (timeString.includes("T")) {
			return new Date(timeString)
		}

		// Handle HH:MM or HH:MM:SS format
		const timeParts = timeString.split(":")
		if (timeParts.length >= 2) {
			const hoursStr = timeParts[0]
			const minutesStr = timeParts[1]
			const secondsStr = timeParts[2]
			
			if (!hoursStr || !minutesStr) {
				throw new BadRequestException(`Invalid time format: ${timeString}`)
			}
			
			const hours = parseInt(hoursStr, 10)
			const minutes = parseInt(minutesStr, 10)
			const seconds = secondsStr ? parseInt(secondsStr, 10) : 0

			// Create a timestamp using UTC to avoid timezone issues
			const date = new Date()
			date.setUTCHours(hours, minutes, seconds, 0)
			return date
		}

		throw new BadRequestException(`Invalid time format: ${timeString}`)
	}

	private parseTimeString(timeString: string): Date {
		// Parse time string in format "HH:MM:SS" or "HH:MM"
		const timeParts = timeString.split(":")
		if (timeParts.length >= 2) {
			const hoursStr = timeParts[0]
			const minutesStr = timeParts[1]
			const secondsStr = timeParts[2]
			
			if (!hoursStr || !minutesStr) {
				throw new BadRequestException(`Invalid time format: ${timeString}`)
			}
			
			const hours = parseInt(hoursStr, 10)
			const minutes = parseInt(minutesStr, 10)
			const seconds = secondsStr ? parseInt(secondsStr, 10) : 0

			const date = new Date()
			date.setUTCHours(hours, minutes, seconds, 0)
			return date
		}

		throw new BadRequestException(`Invalid time format: ${timeString}`)
	}

	private formatTime(timeValue: string | Date): string {
		// Format time back to HH:MM format
		let date: Date
		
		if (timeValue instanceof Date) {
			date = timeValue
		} else if (timeValue.includes("T")) {
			date = new Date(timeValue)
		} else {
			// Already in HH:MM format
			return timeValue
		}

		const hours = date.getUTCHours().toString().padStart(2, "0")
		const minutes = date.getUTCMinutes().toString().padStart(2, "0")
		return `${hours}:${minutes}`
	}
}
