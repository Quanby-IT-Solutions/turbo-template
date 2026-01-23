import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { eq } from "drizzle-orm"

import { organizationSettings } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class OrganizationSettingsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	/**
	 * Get organization settings by organization ID
	 */
	async getByOrganizationId(organizationId: string) {
		const [settings] = await this.db
			.select()
			.from(organizationSettings)
			.where(eq(organizationSettings.organizationId, organizationId))
			.limit(1)

		if (!settings) {
			// Return default settings if none exist
			return this.createDefaultSettings(organizationId)
		}

		return this.formatSettings(settings)
	}

	/**
	 * Create or update organization settings
	 */
	async upsertSettings(organizationId: string, data: any) {
		// Validate time formats
		this.validateTimeFormat(data.clinicStartTime, "Clinic start time")
		this.validateTimeFormat(data.clinicEndTime, "Clinic end time")
		
		if (data.breakStartTime) {
			this.validateTimeFormat(data.breakStartTime, "Break start time")
		}
		if (data.breakEndTime) {
			this.validateTimeFormat(data.breakEndTime, "Break end time")
		}

		// Validate that end time is after start time
		if (data.clinicStartTime && data.clinicEndTime) {
			if (data.clinicStartTime >= data.clinicEndTime) {
				throw new BadRequestException("Clinic end time must be after start time")
			}
		}

		// Validate break times if both are provided
		if (data.breakStartTime && data.breakEndTime) {
			if (data.breakStartTime >= data.breakEndTime) {
				throw new BadRequestException("Break end time must be after break start time")
			}
		}

		// Validate working days
		if (data.workingDays) {
			const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
			const invalidDays = data.workingDays.filter((day: string) => !validDays.includes(day))
			if (invalidDays.length > 0) {
				throw new BadRequestException(`Invalid working days: ${invalidDays.join(', ')}`)
			}
		}

		// Check if settings already exist
		const [existing] = await this.db
			.select()
			.from(organizationSettings)
			.where(eq(organizationSettings.organizationId, organizationId))
			.limit(1)

		let result

		if (existing) {
			// Update existing settings
			const [updated] = await this.db
				.update(organizationSettings)
				.set({
					...data,
					updatedAt: new Date(),
				})
				.where(eq(organizationSettings.organizationId, organizationId))
				.returning()
			result = updated
		} else {
			// Create new settings
			const [created] = await this.db
				.insert(organizationSettings)
				.values({
					organizationId,
					...data,
				})
				.returning()
			result = created
		}

		return this.formatSettings(result)
	}

	/**
	 * Delete organization settings
	 */
	async deleteSettings(organizationId: string) {
		const [deleted] = await this.db
			.delete(organizationSettings)
			.where(eq(organizationSettings.organizationId, organizationId))
			.returning()

		if (!deleted) {
			throw new NotFoundException("Settings not found")
		}

		return { message: "Settings deleted successfully" }
	}

	/**
	 * Create default settings for an organization
	 */
	private async createDefaultSettings(organizationId: string) {
		const [settings] = await this.db
			.insert(organizationSettings)
			.values({
				organizationId,
				clinicStartTime: "08:00:00",
				clinicEndTime: "17:00:00",
				appointmentSlotDuration: 30,
				maxAppointmentsPerSlot: 1,
				bookingWindowDays: 30,
				minAdvanceBookingHours: 2,
				workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
			})
			.returning()

		return this.formatSettings(settings)
	}

	/**
	 * Format settings for API response
	 */
	private formatSettings(settings: any) {
		return {
			...settings,
			createdAt: settings.createdAt instanceof Date ? settings.createdAt.toISOString() : settings.createdAt,
			updatedAt: settings.updatedAt instanceof Date ? settings.updatedAt.toISOString() : settings.updatedAt,
		}
	}

	/**
	 * Validate time format (HH:MM:SS or HH:MM)
	 */
	private validateTimeFormat(time: string, fieldName: string) {
		if (!time) return

		const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
		if (!timeRegex.test(time)) {
			throw new BadRequestException(`${fieldName} must be in HH:MM or HH:MM:SS format`)
		}
	}
}
