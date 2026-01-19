import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { desc, eq } from "drizzle-orm"

import { DB, type DBType } from "@/common/database/database-providers"
import { diagnoses, doctorInfos, labRequests, organizations, patientInfos, prescriptions, users } from "@repo/db/schema"

@Injectable()
export class WebRtcService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	/**
	 * Get doctor ID from room by querying records (prescriptions, diagnoses, lab requests, consultations)
	 */
	async getDoctorIdByRoomId(roomId: string): Promise<string | null> {
		// Try to find doctor from prescriptions
		const [prescription] = await this.db
			.select({ doctorId: prescriptions.doctorId })
			.from(prescriptions)
			.where(eq(prescriptions.roomId, roomId))
			.orderBy(desc(prescriptions.createdAt))
			.limit(1)

		if (prescription?.doctorId) {
			return prescription.doctorId
		}

		// Try to find doctor from diagnoses
		const [diagnosis] = await this.db
			.select({ doctorId: diagnoses.doctorId })
			.from(diagnoses)
			.where(eq(diagnoses.roomId, roomId))
			.orderBy(desc(diagnoses.createdAt))
			.limit(1)

		if (diagnosis?.doctorId) {
			return diagnosis.doctorId
		}

		// Try to find doctor from lab requests
		const [labRequest] = await this.db
			.select({ doctorId: labRequests.doctorId })
			.from(labRequests)
			.where(eq(labRequests.roomId, roomId))
			.orderBy(desc(labRequests.createdAt))
			.limit(1)

		if (labRequest?.doctorId) {
			return labRequest.doctorId
		}

		return null
	}

	/**
	 * Get patient ID from room by querying records
	 */
	async getPatientIdByRoomId(roomId: string): Promise<string | null> {
		// Try to find patient from prescriptions
		const [prescription] = await this.db
			.select({ patientId: prescriptions.patientId })
			.from(prescriptions)
			.where(eq(prescriptions.roomId, roomId))
			.orderBy(desc(prescriptions.createdAt))
			.limit(1)

		if (prescription?.patientId) {
			return prescription.patientId
		}

		// Try to find patient from diagnoses
		const [diagnosis] = await this.db
			.select({ patientId: diagnoses.patientId })
			.from(diagnoses)
			.where(eq(diagnoses.roomId, roomId))
			.orderBy(desc(diagnoses.createdAt))
			.limit(1)

		if (diagnosis?.patientId) {
			return diagnosis.patientId
		}

		// Try to find patient from lab requests
		const [labRequest] = await this.db
			.select({ patientId: labRequests.patientId })
			.from(labRequests)
			.where(eq(labRequests.roomId, roomId))
			.orderBy(desc(labRequests.createdAt))
			.limit(1)

		if (labRequest?.patientId) {
			return labRequest.patientId
		}

		return null
	}

	/**
	 * Get doctor by room ID
	 */
	async getDoctorByRoomId(roomId: string, currentUser?: any) {
		let doctorId = await this.getDoctorIdByRoomId(roomId)

		// If no doctor found in database records, and current user is a doctor, use their ID
		if (!doctorId && currentUser?.role === "DOCTOR" && currentUser?.id) {
			doctorId = currentUser.id
		}

		if (!doctorId) {
			throw new NotFoundException("Doctor not found for this room")
		}

		const [doctor] = await this.db
			.select({
				user: users,
				doctorInfo: doctorInfos,
			})
			.from(users)
			.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
			.where(eq(users.id, doctorId))
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

	/**
	 * Get patient by room ID
	 */
	async getPatientByRoomId(roomId: string, currentUser?: any) {
		let patientId = await this.getPatientIdByRoomId(roomId)

		// If no patient found in database records, and current user is a patient, use their ID
		if (!patientId && currentUser?.role === "PATIENT" && currentUser?.id) {
			patientId = currentUser.id
		}

		if (!patientId) {
			throw new NotFoundException("Patient not found for this room")
		}

		const [patient] = await this.db
			.select({
				user: users,
				patientInfo: patientInfos,
			})
			.from(users)
			.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
			.where(eq(users.id, patientId))
			.limit(1)

		if (!patient) {
			throw new NotFoundException("Patient not found")
		}

		return {
			id: patient.user.id,
			email: patient.user.email,
			patientInfo: {
				firstName: patient.patientInfo.firstName,
				middleName: patient.patientInfo.middleName,
				lastName: patient.patientInfo.lastName,
				gender: patient.patientInfo.gender,
				dateOfBirth: patient.patientInfo.dateOfBirth
					? (patient.patientInfo.dateOfBirth instanceof Date
							? patient.patientInfo.dateOfBirth.toISOString()
							: patient.patientInfo.dateOfBirth)
					: null,
				contactNumber: patient.patientInfo.contactNumber,
				address: patient.patientInfo.address,
				weight: patient.patientInfo.weight,
				height: patient.patientInfo.height,
				bloodType: patient.patientInfo.bloodType,
				medicalHistory: patient.patientInfo.medicalHistory,
				allergies: patient.patientInfo.allergies,
				medications: patient.patientInfo.medications,
				philHealthId: patient.patientInfo.philHealthId,
				philHealthStatus: patient.patientInfo.philHealthStatus,
				philHealthCategory: patient.patientInfo.philHealthCategory,
				philHealthExpiry: patient.patientInfo.philHealthExpiry
					? (patient.patientInfo.philHealthExpiry instanceof Date
							? patient.patientInfo.philHealthExpiry.toISOString()
							: patient.patientInfo.philHealthExpiry)
					: null,
				philHealthMemberSince: patient.patientInfo.philHealthMemberSince
					? (patient.patientInfo.philHealthMemberSince instanceof Date
							? patient.patientInfo.philHealthMemberSince.toISOString()
							: patient.patientInfo.philHealthMemberSince)
					: null,
				philHealthIdImage: patient.patientInfo.philHealthIdImage,
			},
			createdAt:
				patient.user.createdAt instanceof Date
					? patient.user.createdAt.toISOString()
					: patient.user.createdAt,
		}
	}
}
