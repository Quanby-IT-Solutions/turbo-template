import { Inject, Injectable } from "@nestjs/common"
import { eq, and, or, isNull } from "drizzle-orm"

import { prescriptions } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class PrescriptionsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll(query: any) {
		return this.db.select().from(prescriptions).limit(query.limit || 10).offset(query.offset || 0)
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(prescriptions)
			.where(eq(prescriptions.id, id))
			.limit(1)
		return result
	}

	async getDoctorPrescriptions(doctorId: string) {
		return this.db
			.select()
			.from(prescriptions)
			.where(eq(prescriptions.doctorId, doctorId))
	}

	async getPatientPrescriptions(patientId: string) {
		return this.db
			.select()
			.from(prescriptions)
			.where(eq(prescriptions.patientId, patientId))
	}

	async getRoomPrescriptions(roomId: string) {
		return this.db
			.select()
			.from(prescriptions)
			.where(eq(prescriptions.roomId, roomId))
	}

	async create(data: any) {
		const [result] = await this.db
			.insert(prescriptions)
			.values({
				patientId: data.patientId,
				doctorId: data.doctorId,
				consultationId: data.consultationId || null,
				roomId: data.roomId || null,
				medicationName: data.medicationName,
				dosage: data.dosage,
				frequency: data.frequency,
				duration: data.duration,
				instructions: data.instructions || null,
				quantity: data.quantity || null,
				refills: data.refills || 0,
				isActive: data.isActive !== undefined ? data.isActive : true,
				prescribedAt: data.prescribedAt ? new Date(data.prescribedAt) : new Date(),
				expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
				notes: data.notes || null,
			})
			.returning()
		return result
	}
}
