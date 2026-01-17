import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common"
import { eq, and, or, isNull } from "drizzle-orm"

import { diagnoses, patientMedicalHistories } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class DiagnosesService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	private serialize(d: any) {
		if (!d) return d
		const toIso = (v: any) => (v instanceof Date ? v.toISOString() : v)
		return {
			...d,
			onsetDate: d.onsetDate ? toIso(d.onsetDate) : null,
			diagnosedAt: toIso(d.diagnosedAt),
			resolvedAt: d.resolvedAt ? toIso(d.resolvedAt) : null,
			createdAt: toIso(d.createdAt),
			updatedAt: toIso(d.updatedAt),
		}
	}

	async findAll(query: any) {
		const rows = await this.db.select().from(diagnoses).limit(query.limit || 10).offset(query.offset || 0)
		return rows.map(r => this.serialize(r))
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(diagnoses)
			.where(eq(diagnoses.id, id))
			.limit(1)
		return this.serialize(result)
	}

	async getDoctorDiagnoses(doctorId: string) {
		const rows = await this.db
			.select()
			.from(diagnoses)
			.where(eq(diagnoses.doctorId, doctorId))
		return rows.map(r => this.serialize(r))
	}

	async getPatientDiagnoses(patientId: string) {
		const rows = await this.db
			.select()
			.from(diagnoses)
			.where(eq(diagnoses.patientId, patientId))
		return rows.map(r => this.serialize(r))
	}

	async getRoomDiagnoses(roomId: string) {
		const rows = await this.db
			.select()
			.from(diagnoses)
			.where(eq(diagnoses.roomId, roomId))
		return rows.map(r => this.serialize(r))
	}

	async create(data: any) {
		const [result] = await this.db
			.insert(diagnoses)
			.values({
				patientId: data.patientId,
				doctorId: data.doctorId,
				consultationId: data.consultationId || null,
				roomId: data.roomId || null,
				diagnosisCode: data.diagnosisCode || null,
				diagnosisName: data.diagnosisName,
				description: data.description || null,
				severity: data.severity || "MILD",
				status: data.status || "ACTIVE",
				onsetDate: data.onsetDate ? new Date(data.onsetDate) : null,
				diagnosedAt: data.diagnosedAt ? new Date(data.diagnosedAt) : new Date(),
				resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : null,
				notes: data.notes || null,
				isPrimary: data.isPrimary || false,
			})
			.returning()

		if (!result) {
			throw new InternalServerErrorException("Failed to create diagnosis")
		}

		// Populate patient medical records (for patient history screens)
		// Use recordType "DIAGNOSIS" for diagnoses.
		try {
			await this.db.insert(patientMedicalHistories).values({
				patientId: result.patientId,
				consultationId: result.consultationId ?? null,
				recordType: "DIAGNOSIS",
				title: `Diagnosis: ${result.diagnosisName}`,
				content: JSON.stringify({
					roomId: result.roomId,
					diagnosisId: result.id,
					diagnosisCode: result.diagnosisCode,
					diagnosisName: result.diagnosisName,
					description: result.description,
					severity: result.severity,
					status: result.status,
					onsetDate: result.onsetDate,
					diagnosedAt: result.diagnosedAt,
					resolvedAt: result.resolvedAt,
					notes: result.notes,
					isPrimary: result.isPrimary,
				}),
				isPublic: false,
				isSensitive: false,
				createdBy: result.doctorId,
			})
		} catch {
			// If medical record insert fails, don't block diagnosis creation.
		}

		return this.serialize(result)
	}
}
