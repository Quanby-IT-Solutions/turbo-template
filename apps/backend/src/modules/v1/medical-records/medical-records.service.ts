import { Inject, Injectable } from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import { patientMedicalHistories } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class MedicalRecordsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll(
		query: { patientId?: string; recordType?: string; limit?: number; offset?: number },
		currentUser?: any
	) {
		const role = currentUser?.role
		const currentUserId = currentUser?.userId || currentUser?.id

		// Patients can only see their own records (ignore provided patientId)
		const effectivePatientId =
			role === "PATIENT" ? currentUserId : (query.patientId || undefined)

		const whereConditions = []
		if (effectivePatientId) {
			whereConditions.push(eq(patientMedicalHistories.patientId, effectivePatientId))
		}
		if (query.recordType) {
			whereConditions.push(eq(patientMedicalHistories.recordType, query.recordType as any))
		}

		const limit = query.limit || 50
		const offset = query.offset || 0

		return this.db
			.select()
			.from(patientMedicalHistories)
			.where(whereConditions.length ? and(...(whereConditions as any)) : undefined)
			.limit(limit)
			.offset(offset)
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(patientMedicalHistories)
			.where(eq(patientMedicalHistories.id, id))
			.limit(1)
		return result
	}
}
