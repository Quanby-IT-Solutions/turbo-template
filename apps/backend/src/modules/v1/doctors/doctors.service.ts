import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { and, eq, inArray, sql } from "drizzle-orm"

import { doctorInfos, organizations, users } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class DoctorsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll(query: { page?: number; limit?: number; search?: string; organizationId?: string }) {
		const page = query.page || 1
		const limit = query.limit || 10
		const offset = (page - 1) * limit

		let whereConditions: any[] = [eq(users.role, "DOCTOR" as any)]

		if (query.search) {
			whereConditions.push(sql`${doctorInfos.firstName} ILIKE ${"%" + query.search + "%"}`)
		}

		if (query.organizationId) {
			whereConditions.push(eq(users.organizationId, query.organizationId))
		}

		// Get doctors and total count in parallel
		const [doctorsRaw, countResult] = await Promise.all([
			this.db
				.select({
					user: users,
					doctorInfo: doctorInfos,
				})
				.from(users)
				.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
				.where(and(...whereConditions))
				.limit(limit)
				.offset(offset),
			this.db
				.select({ count: sql<number>`count(*)::int`.as("count") })
				.from(users)
				.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
				.where(and(...whereConditions)),
		])

		const total = countResult[0]?.count || 0

		// Get organization IDs for doctors that have organizations (remove duplicates)
		const orgIds = [
			...new Set(
				doctorsRaw
					.map(d => d.user.organizationId)
					.filter((id): id is string => id !== null)
			),
		]

		// Fetch organizations in batch if any doctors have organizations
		const orgsMap = new Map<string, { id: string; name: string }>()
		if (orgIds.length > 0) {
			const orgs = await this.db
				.select({
					id: organizations.id,
					name: organizations.name,
				})
				.from(organizations)
				.where(inArray(organizations.id, orgIds))

			orgs.forEach(org => orgsMap.set(org.id, org))
		}

		// Format doctors to match frontend expectations (same format as super-admin endpoint)
		const doctors = doctorsRaw.map(doctor => {
			const org = doctor.user.organizationId ? orgsMap.get(doctor.user.organizationId) : null

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
				id: doctor.user.id, // This ensures doctor.id exists for React key prop
				email: doctor.user.email,
				organizationId: doctor.user.organizationId,
				organization: org ? { id: org.id, name: org.name } : null,
				doctorInfo: {
					firstName: doctor.doctorInfo.firstName,
					middleName: doctor.doctorInfo.middleName,
					lastName: doctor.doctorInfo.lastName,
					specialization: doctor.doctorInfo.specialization,
					qualifications: doctor.doctorInfo.qualifications,
					experience: doctor.doctorInfo.experience,
					contactNumber: doctor.doctorInfo.contactNumber,
					approvalStatus: doctor.doctorInfo.approvalStatus,
					approvalStatusUpdatedAt: doctor.doctorInfo.approvalStatusUpdatedAt
						? (doctor.doctorInfo.approvalStatusUpdatedAt instanceof Date
								? doctor.doctorInfo.approvalStatusUpdatedAt.toISOString()
								: doctor.doctorInfo.approvalStatusUpdatedAt)
						: null,
					approvalRejectionReason: doctor.doctorInfo.approvalRejectionReason,
					prcIdImage: convertImage(doctor.doctorInfo.prcIdImage),
					ptrIdImage: convertImage(doctor.doctorInfo.ptrIdImage),
					medicalLicenseImage: convertImage(doctor.doctorInfo.medicalLicenseImage),
				},
				createdAt:
					doctor.user.createdAt instanceof Date
						? doctor.user.createdAt.toISOString()
						: doctor.user.createdAt,
			}
		})

		// Return in paginated format for consistency
		return {
			items: doctors,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit) || 1,
		}
	}

	async findOne(id: string) {
		const [doctor] = await this.db
			.select({
				user: users,
				doctorInfo: doctorInfos,
			})
			.from(users)
			.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
			.where(eq(users.id, id))
			.limit(1)

		if (!doctor) {
			throw new NotFoundException("Doctor not found")
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

		const org = doctor.user.organizationId
			? await this.db
					.select({ id: organizations.id, name: organizations.name })
					.from(organizations)
					.where(eq(organizations.id, doctor.user.organizationId))
					.limit(1)
					.then(([org]) => org)
			: null

		return {
			id: doctor.user.id,
			email: doctor.user.email,
			organizationId: doctor.user.organizationId,
			organization: org ? { id: org.id, name: org.name } : null,
			doctorInfo: {
				firstName: doctor.doctorInfo.firstName,
				middleName: doctor.doctorInfo.middleName,
				lastName: doctor.doctorInfo.lastName,
				specialization: doctor.doctorInfo.specialization,
				qualifications: doctor.doctorInfo.qualifications,
				experience: doctor.doctorInfo.experience,
				contactNumber: doctor.doctorInfo.contactNumber,
				approvalStatus: doctor.doctorInfo.approvalStatus,
				approvalStatusUpdatedAt: doctor.doctorInfo.approvalStatusUpdatedAt
					? (doctor.doctorInfo.approvalStatusUpdatedAt instanceof Date
							? doctor.doctorInfo.approvalStatusUpdatedAt.toISOString()
							: doctor.doctorInfo.approvalStatusUpdatedAt)
					: null,
				approvalRejectionReason: doctor.doctorInfo.approvalRejectionReason,
				prcIdImage: convertImage(doctor.doctorInfo.prcIdImage),
				ptrIdImage: convertImage(doctor.doctorInfo.ptrIdImage),
				medicalLicenseImage: convertImage(doctor.doctorInfo.medicalLicenseImage),
			},
			createdAt:
				doctor.user.createdAt instanceof Date
					? doctor.user.createdAt.toISOString()
					: doctor.user.createdAt,
		}
	}
}
