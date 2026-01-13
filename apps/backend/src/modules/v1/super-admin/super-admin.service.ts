import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { and, desc, eq, inArray, sql } from "drizzle-orm"

import {
	doctorApprovalStatusEnum,
	doctorInfos,
	organizations,
	patientInfos,
	patientVerificationStatusEnum,
	users,
} from "@repo/db/schema"
import type { DoctorApprovalStatus, PatientVerificationStatus } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class SuperAdminService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async getStats() {
		// Get various statistics
		return { totalUsers: 0 }
	}

	async getPatientsPendingVerification(page?: number, limit?: number, status?: string) {
		const pageNum = page ? Math.max(page, 1) : 1
		const limitNum = limit ? Math.min(Math.max(limit, 1), 100) : 10
		const skip = (pageNum - 1) * limitNum

		// Build where clause
		const whereConditions = status
			? and(eq(users.role, "PATIENT" as const), eq(patientInfos.verificationStatus, status as PatientVerificationStatus))
			: eq(users.role, "PATIENT" as const)

		// Get patients with all fields
		const patients = await this.db
			.select({
				user: users,
				patientInfo: patientInfos,
			})
			.from(users)
			.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
			.where(whereConditions)
			.orderBy(desc(users.createdAt))
			.limit(limitNum)
			.offset(skip)

		// Count total
		const countResult = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(users)
			.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
			.where(whereConditions)
			.limit(1)

		const total = countResult[0]?.count ?? 0

		// Convert Buffer (bytea) to base64 for frontend and format response
		const patientsWithBase64 = patients.map((patient: any) => {
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

			const formatted: any = {
				id: patient.user.id,
				email: patient.user.email,
				createdAt:
					patient.user.createdAt instanceof Date
						? patient.user.createdAt.toISOString()
						: patient.user.createdAt,
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
			}

			return formatted
		})

		return {
			items: patientsWithBase64,
			total: Number(total),
			page: pageNum,
			limit: limitNum,
			totalPages: Math.ceil(Number(total) / limitNum) || 1,
		}
	}

	async updatePatientVerificationStatus(patientId: string, body: { status: string; rejectionReason?: string }) {
		const { status, rejectionReason } = body

		if (!status || !patientVerificationStatusEnum.enumValues.includes(status as PatientVerificationStatus)) {
			throw new BadRequestException("Invalid verification status. Must be VERIFIED or REJECTED")
		}

		if (status === "REJECTED" && !rejectionReason) {
			throw new BadRequestException("Rejection reason is required when rejecting a patient")
		}

		// Check if patient exists
		const [patient] = await this.db
			.select()
			.from(users)
			.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
			.where(and(eq(users.id, patientId), eq(users.role, "PATIENT" as const)))
			.limit(1)

		if (!patient) {
			throw new NotFoundException("Patient not found")
		}

		// Update patient verification status
		const updateData: any = {
			verificationStatus: status as PatientVerificationStatus,
			verificationStatusUpdatedAt: new Date(),
		}

		if (status === "REJECTED" && rejectionReason) {
			updateData.verificationRejectionReason = rejectionReason
		} else if (status === "VERIFIED") {
			updateData.verificationRejectionReason = null
			updateData.philHealthIdVerified = true
			updateData.philHealthIdVerifiedAt = new Date()
		}

		await this.db.update(patientInfos).set(updateData).where(eq(patientInfos.userId, patientId))

		// Return updated patient
		const [updatedPatient] = await this.db
			.select()
			.from(users)
			.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
			.where(eq(users.id, patientId))
			.limit(1)

		return updatedPatient
	}

	async getDoctors(page?: number, limit?: number, status?: string, organizationId?: string) {
		const pageNum = page ? Math.max(page, 1) : 1
		const limitNum = limit ? Math.min(Math.max(limit, 1), 100) : 10
		const offset = (pageNum - 1) * limitNum

		// Build where conditions
		const whereConditions: any[] = [eq(users.role, "DOCTOR" as const)]

		if (status) {
			if (!doctorApprovalStatusEnum.enumValues.includes(status as DoctorApprovalStatus)) {
				throw new BadRequestException("Invalid approval status provided")
			}
			whereConditions.push(eq(doctorInfos.approvalStatus, status as DoctorApprovalStatus))
		}

		if (organizationId) {
			whereConditions.push(eq(users.organizationId, organizationId))
		}

		// Fetch doctors
		const doctorsRaw = await this.db
			.select({
				user: users,
				doctorInfo: doctorInfos,
			})
			.from(users)
			.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
			.where(and(...whereConditions))
			.limit(limitNum)
			.offset(offset)

		// Get organization info separately for each doctor
		const orgIds = [
			...new Set(doctorsRaw.map(d => d.user.organizationId).filter((id): id is string => id !== null)),
		]
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

		// Count total
		const countResult = await this.db
			.select({ count: sql<number>`count(*)::int`.as("count") })
			.from(users)
			.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
			.where(and(...whereConditions))

		const total = countResult[0]?.count || 0

		// Format response
		const formattedDoctors = doctorsRaw.map(doctor => {
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
				id: doctor.user.id,
				email: doctor.user.email,
				organizationId: doctor.user.organizationId,
				organization: org
					? {
							id: org.id,
							name: org.name,
						}
					: null,
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

		return {
			items: formattedDoctors,
			total: total,
			page: pageNum,
			limit: limitNum,
			totalPages: Math.ceil(total / limitNum) || 1,
		}
	}
}
