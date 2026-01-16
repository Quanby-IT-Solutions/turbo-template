import { Inject, Injectable } from "@nestjs/common"
import { eq, and, or, isNull } from "drizzle-orm"

import { diagnoses } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class DiagnosesService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll(query: any) {
		return this.db.select().from(diagnoses).limit(query.limit || 10).offset(query.offset || 0)
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(diagnoses)
			.where(eq(diagnoses.id, id))
			.limit(1)
		return result
	}

	async getDoctorDiagnoses(doctorId: string) {
		return this.db
			.select()
			.from(diagnoses)
			.where(eq(diagnoses.doctorId, doctorId))
	}

	async getPatientDiagnoses(patientId: string) {
		return this.db
			.select()
			.from(diagnoses)
			.where(eq(diagnoses.patientId, patientId))
	}

	async getRoomDiagnoses(roomId: string) {
		return this.db
			.select()
			.from(diagnoses)
			.where(eq(diagnoses.roomId, roomId))
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
		return result
	}
}
