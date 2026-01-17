import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common"
import { eq, and, or, isNull } from "drizzle-orm"

import { patientMedicalHistories, prescriptions } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class PrescriptionsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	private serialize(p: any) {
		if (!p) return p
		const toIso = (v: any) => (v instanceof Date ? v.toISOString() : v)
		return {
			...p,
			prescribedAt: toIso(p.prescribedAt),
			expiresAt: p.expiresAt ? toIso(p.expiresAt) : null,
			createdAt: toIso(p.createdAt),
			updatedAt: toIso(p.updatedAt),
		}
	}

	async findAll(query: any) {
		const rows = await this.db
			.select()
			.from(prescriptions)
			.limit(query.limit || 10)
			.offset(query.offset || 0)
		return rows.map(r => this.serialize(r))
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(prescriptions)
			.where(eq(prescriptions.id, id))
			.limit(1)
		return this.serialize(result)
	}

	async getDoctorPrescriptions(doctorId: string) {
		const rows = await this.db
			.select()
			.from(prescriptions)
			.where(eq(prescriptions.doctorId, doctorId))
		return rows.map(r => this.serialize(r))
	}

	async getPatientPrescriptions(patientId: string) {
		const rows = await this.db
			.select()
			.from(prescriptions)
			.where(eq(prescriptions.patientId, patientId))
		return rows.map(r => this.serialize(r))
	}

	async getRoomPrescriptions(roomId: string) {
		const rows = await this.db
			.select()
			.from(prescriptions)
			.where(eq(prescriptions.roomId, roomId))
		return rows.map(r => this.serialize(r))
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

		if (!result) {
			throw new InternalServerErrorException("Failed to create prescription")
		}

		// Populate patient medical records (for patient history screens)
		// Use recordType "MEDICATION" for prescriptions.
		try {
			await this.db.insert(patientMedicalHistories).values({
				patientId: result.patientId,
				consultationId: result.consultationId ?? null,
				recordType: "MEDICATION",
				title: `Prescription: ${result.medicationName}`,
				content: JSON.stringify({
					roomId: result.roomId,
					prescriptionId: result.id,
					medicationName: result.medicationName,
					dosage: result.dosage,
					frequency: result.frequency,
					duration: result.duration,
					instructions: result.instructions,
					quantity: result.quantity,
					refills: result.refills,
					expiresAt: result.expiresAt,
					notes: result.notes,
				}),
				isPublic: false,
				isSensitive: false,
				createdBy: result.doctorId,
			})
		} catch {
			// If medical record insert fails, don't block prescription creation.
		}

		return this.serialize(result)
	}
}
