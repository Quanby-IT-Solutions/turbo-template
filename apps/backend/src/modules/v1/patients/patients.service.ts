import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { and, eq, sql } from "drizzle-orm"

import { patientInfos, users } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class PatientsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll(query: { page?: number; limit?: number; search?: string }) {
		const page = query.page || 1
		const limit = query.limit || 10
		const offset = (page - 1) * limit

		const whereConditions: any[] = [eq(users.role, "PATIENT" as any)]

		if (query.search) {
			whereConditions.push(sql`${patientInfos.firstName} ILIKE ${`%${  query.search  }%`}`)
		}

		const [patients, countResult] = await Promise.all([
			this.db
				.select({
					user: users,
					patientInfo: patientInfos,
				})
				.from(users)
				.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
				.where(and(...whereConditions))
				.limit(limit)
				.offset(offset),
			this.db
				.select({ count: sql<number>`count(*)::int`.as("count") })
				.from(users)
				.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
				.where(and(...whereConditions)),
		])

		const total = countResult[0]?.count || 0

		const formattedPatients = patients.map(patient => ({
			id: patient.user.id,
			email: patient.user.email,
			patientInfo: {
				...patient.patientInfo,
				dateOfBirth:
					patient.patientInfo.dateOfBirth instanceof Date
						? patient.patientInfo.dateOfBirth.toISOString()
						: (patient.patientInfo.dateOfBirth as any),
				verificationStatusUpdatedAt: patient.patientInfo.verificationStatusUpdatedAt
					? (patient.patientInfo.verificationStatusUpdatedAt instanceof Date
							? patient.patientInfo.verificationStatusUpdatedAt.toISOString()
							: patient.patientInfo.verificationStatusUpdatedAt)
					: null,
				philHealthIdImage: patient.patientInfo.philHealthIdImage
					? (Buffer.isBuffer(patient.patientInfo.philHealthIdImage)
							? patient.patientInfo.philHealthIdImage.toString("base64")
							: patient.patientInfo.philHealthIdImage)
					: null,
			},
			createdAt:
				patient.user.createdAt instanceof Date
					? patient.user.createdAt.toISOString()
					: patient.user.createdAt,
		}))

		return {
			items: formattedPatients,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit) || 1,
		}
	}

	async findOne(id: string) {
		const [patient] = await this.db
			.select({
				user: users,
				patientInfo: patientInfos,
			})
			.from(users)
			.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
			.where(eq(users.id, id))
			.limit(1)

		if (!patient) {
			throw new NotFoundException("Patient not found")
		}

		return {
			id: patient.user.id,
			email: patient.user.email,
			patientInfo: {
				...patient.patientInfo,
				dateOfBirth:
					patient.patientInfo.dateOfBirth instanceof Date
						? patient.patientInfo.dateOfBirth.toISOString()
						: (patient.patientInfo.dateOfBirth as any),
				verificationStatusUpdatedAt: patient.patientInfo.verificationStatusUpdatedAt
					? (patient.patientInfo.verificationStatusUpdatedAt instanceof Date
							? patient.patientInfo.verificationStatusUpdatedAt.toISOString()
							: patient.patientInfo.verificationStatusUpdatedAt)
					: null,
				philHealthIdImage: patient.patientInfo.philHealthIdImage
					? (Buffer.isBuffer(patient.patientInfo.philHealthIdImage)
							? patient.patientInfo.philHealthIdImage.toString("base64")
							: patient.patientInfo.philHealthIdImage)
					: null,
			},
			createdAt:
				patient.user.createdAt instanceof Date
					? patient.user.createdAt.toISOString()
					: patient.user.createdAt,
		}
	}
}
