import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { UpdatePatientInfoDto } from "@repo/contracts"
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

		let whereConditions: any[] = [eq(users.role, "PATIENT" as any)]

		if (query.search) {
			whereConditions.push(sql`${patientInfos.firstName} ILIKE ${"%" + query.search + "%"}`)
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

		// Convert image buffers to base64 if present
		const convertImage = (image: any): string | null => {
			if (!image) return null
			if (Buffer.isBuffer(image)) {
				return image.toString("base64")
			}
			if (typeof image === "string") {
				return image
			}
			return null
		}

		return {
			id: patient.user.id,
			email: patient.user.email,
			patientInfo: {
				...patient.patientInfo,
				dateOfBirth: patient.patientInfo.dateOfBirth instanceof Date
					? patient.patientInfo.dateOfBirth.toISOString()
					: patient.patientInfo.dateOfBirth,
				philHealthExpiry: patient.patientInfo.philHealthExpiry instanceof Date
					? patient.patientInfo.philHealthExpiry.toISOString()
					: patient.patientInfo.philHealthExpiry,
				philHealthMemberSince: patient.patientInfo.philHealthMemberSince instanceof Date
					? patient.patientInfo.philHealthMemberSince.toISOString()
					: patient.patientInfo.philHealthMemberSince,
				philHealthIdVerifiedAt: patient.patientInfo.philHealthIdVerifiedAt instanceof Date
					? patient.patientInfo.philHealthIdVerifiedAt.toISOString()
					: patient.patientInfo.philHealthIdVerifiedAt,
				verificationStatusUpdatedAt: patient.patientInfo.verificationStatusUpdatedAt instanceof Date
					? patient.patientInfo.verificationStatusUpdatedAt.toISOString()
					: patient.patientInfo.verificationStatusUpdatedAt,
				subscriptionStartDate: patient.patientInfo.subscriptionStartDate instanceof Date
					? patient.patientInfo.subscriptionStartDate.toISOString()
					: patient.patientInfo.subscriptionStartDate,
				subscriptionEndDate: patient.patientInfo.subscriptionEndDate instanceof Date
					? patient.patientInfo.subscriptionEndDate.toISOString()
					: patient.patientInfo.subscriptionEndDate,
				philHealthIdImage: convertImage(patient.patientInfo.philHealthIdImage),
			},
			createdAt:
				patient.user.createdAt instanceof Date
					? patient.user.createdAt.toISOString()
					: patient.user.createdAt,
		}
	}

async updatePatientInfo(
  userId: string,
  data: UpdatePatientInfoDto,
) {
  const updateData: Partial<typeof patientInfos.$inferSelect> = {
	...data,
	dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
  }

  if (updateData.dateOfBirth && typeof updateData.dateOfBirth === 'string') {
    updateData.dateOfBirth = new Date(updateData.dateOfBirth)
  }
  await this.db
    .update(patientInfos)
    .set(updateData)
    .where(eq(patientInfos.userId, userId))

  return this.findOne(userId)
}

async delete(id: string) {
	// Verify patient exists
	const [existing] = await this.db
		.select()
		.from(users)
		.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
		.where(and(eq(users.id, id), eq(users.role, "PATIENT" as const)))
		.limit(1)

	if (!existing) {
		throw new NotFoundException(`Patient with ID ${id} not found`)
	}

	// Delete patient info first (due to foreign key constraint)
	await this.db.delete(patientInfos).where(eq(patientInfos.userId, id))
	
	// Delete user
	await this.db.delete(users).where(eq(users.id, id))
}

}

