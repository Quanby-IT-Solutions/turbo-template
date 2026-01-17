import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { and, desc, eq } from "drizzle-orm"

import { patientMedicalHistories } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class MedicalRecordsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	private serialize(r: any) {
		if (!r) return r
		const toIso = (v: any) => (v instanceof Date ? v.toISOString() : v)
		return {
			...r,
			createdAt: toIso(r.createdAt),
			updatedAt: toIso(r.updatedAt),
		}
	}

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

		const rows = await this.db
			.select()
			.from(patientMedicalHistories)
			.where(whereConditions.length ? and(...(whereConditions as any)) : undefined)
			.orderBy(desc(patientMedicalHistories.createdAt))
			.limit(limit)
			.offset(offset)
		return rows.map(r => this.serialize(r))
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(patientMedicalHistories)
			.where(eq(patientMedicalHistories.id, id))
			.limit(1)
		if (!result) {
			throw new NotFoundException("Medical record not found")
		}
		return this.serialize(result)
	}
}
