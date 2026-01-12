import { ForbiddenException, Inject, Injectable } from "@nestjs/common"
import { and, desc, eq, inArray, sql } from "drizzle-orm"

import { appointmentRequests, doctorInfos, patientInfos, users } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class AppointmentsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll(query: any) {
		return this.db.select().from(appointmentRequests).limit(query.limit || 10).offset(query.offset || 0)
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(appointmentRequests)
			.where(eq(appointmentRequests.id, id))
			.limit(1)
		return result
	}

	async getOrganizationAppointments(user: any) {
		const orgId = user?.organizationId
		if (!orgId) {
			throw new ForbiddenException("Organization not found for this account")
		}

		// Find all doctors in this organization
		const doctors = await this.db
			.select({ id: users.id })
			.from(users)
			.where(and(eq(users.organizationId, orgId), eq(users.role, "DOCTOR" as const)))

		const doctorIds = doctors.map(d => d.id)

		// Get all appointments for doctors in this organization
		const appointmentsData = doctorIds.length > 0
			? await this.db
					.select({
						appointmentId: appointmentRequests.id,
						patientId: appointmentRequests.patientId,
						doctorId: appointmentRequests.doctorId,
						requestedDate: appointmentRequests.requestedDate,
						requestedTime: appointmentRequests.requestedTime,
						reason: appointmentRequests.reason,
						status: appointmentRequests.status,
						priority: appointmentRequests.priority,
						notes: appointmentRequests.notes,
						consultationId: appointmentRequests.consultationId,
						createdAt: appointmentRequests.createdAt,
						updatedAt: appointmentRequests.updatedAt,
						doctorEmail: users.email,
						doctorFirstName: doctorInfos.firstName,
						doctorLastName: doctorInfos.lastName,
						doctorSpecialization: doctorInfos.specialization,
					})
					.from(appointmentRequests)
					.innerJoin(users, eq(appointmentRequests.doctorId, users.id))
					.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
					.where(inArray(appointmentRequests.doctorId, doctorIds))
					.orderBy(desc(appointmentRequests.requestedDate), desc(appointmentRequests.requestedTime))
			: []

		// Get patient info for each appointment
		const patientIds = [...new Set(appointmentsData.map(a => a.patientId))]
		const patientsData =
			patientIds.length > 0
				? await this.db
						.select({
							userId: users.id,
							email: users.email,
							patientFirstName: patientInfos.firstName,
							patientMiddleName: patientInfos.middleName,
							patientLastName: patientInfos.lastName,
						})
						.from(users)
						.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
						.where(inArray(users.id, patientIds))
				: []

		const patientsMap = new Map(patientsData.map(p => [p.userId, p]))

		// Format appointments
		const appointments = appointmentsData.map(appointment => {
			const patient = patientsMap.get(appointment.patientId)

			return {
				id: appointment.appointmentId,
				patientId: appointment.patientId,
				doctorId: appointment.doctorId,
				requestedDate: appointment.requestedDate instanceof Date
					? appointment.requestedDate.toISOString()
					: appointment.requestedDate,
				requestedTime: appointment.requestedTime,
				reason: appointment.reason,
				status: appointment.status,
				priority: appointment.priority,
				notes: appointment.notes,
				consultationId: appointment.consultationId,
				createdAt:
					appointment.createdAt instanceof Date
						? appointment.createdAt.toISOString()
						: appointment.createdAt,
				updatedAt:
					appointment.updatedAt instanceof Date
						? appointment.updatedAt.toISOString()
						: appointment.updatedAt,
				doctor: {
					id: appointment.doctorId,
					email: appointment.doctorEmail,
					doctorInfo: {
						firstName: appointment.doctorFirstName,
						lastName: appointment.doctorLastName,
						specialization: appointment.doctorSpecialization,
					},
				},
				patient: patient
					? {
							id: patient.userId,
							email: patient.email,
							patientInfo: {
								firstName: patient.patientFirstName,
								middleName: patient.patientMiddleName,
								lastName: patient.patientLastName,
							},
						}
					: null,
			}
		})

		const total = appointments.length

		return {
			items: appointments,
			total,
			page: 1,
			limit: total,
			totalPages: 1,
		}
	}

	async getMyAppointments(user: any, query: any = {}) {
		const userId = user?.userId || user?.id
		const userRole = user?.role
		const limit = query?.limit ? parseInt(query.limit, 10) : 50
		const page = query?.page ? parseInt(query.page, 10) : 1
		const pageNum = Math.max(page, 1)
		const limitNum = Math.min(Math.max(limit, 1), 100)
		const offset = (pageNum - 1) * limitNum

		if (!userId || !userRole) {
			throw new ForbiddenException("User information not found")
		}

		// Build where condition based on user role
		let whereCondition: any
		if (userRole === "DOCTOR") {
			whereCondition = eq(appointmentRequests.doctorId, userId)
		} else if (userRole === "PATIENT") {
			whereCondition = eq(appointmentRequests.patientId, userId)
		} else {
			throw new ForbiddenException("Invalid role for this endpoint")
		}

		// Optionally filter by status if provided
		if (query.status) {
			whereCondition = and(whereCondition, eq(appointmentRequests.status, query.status as any))
		}

		// Get appointments with doctor and patient info
		const appointmentsData = await this.db
			.select({
				appointmentId: appointmentRequests.id,
				patientId: appointmentRequests.patientId,
				doctorId: appointmentRequests.doctorId,
				requestedDate: appointmentRequests.requestedDate,
				requestedTime: appointmentRequests.requestedTime,
				reason: appointmentRequests.reason,
				status: appointmentRequests.status,
				priority: appointmentRequests.priority,
				notes: appointmentRequests.notes,
				consultationId: appointmentRequests.consultationId,
				createdAt: appointmentRequests.createdAt,
				updatedAt: appointmentRequests.updatedAt,
				doctorEmail: users.email,
				doctorFirstName: doctorInfos.firstName,
				doctorLastName: doctorInfos.lastName,
				doctorSpecialization: doctorInfos.specialization,
			})
			.from(appointmentRequests)
			.innerJoin(users, eq(appointmentRequests.doctorId, users.id))
			.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
			.where(whereCondition)
			.orderBy(desc(appointmentRequests.requestedDate), desc(appointmentRequests.requestedTime))
			.limit(limitNum)
			.offset(offset)

		// Get patient info separately
		const patientIds = [...new Set(appointmentsData.map(a => a.patientId))]
		const patientsData =
			patientIds.length > 0
				? await this.db
						.select({
							userId: users.id,
							email: users.email,
							patientFirstName: patientInfos.firstName,
							patientMiddleName: patientInfos.middleName,
							patientLastName: patientInfos.lastName,
						})
						.from(users)
						.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
						.where(inArray(users.id, patientIds))
				: []

		const patientsMap = new Map(patientsData.map(p => [p.userId, p]))

		// Format appointments
		const appointments = appointmentsData.map(appointment => {
			const patient = patientsMap.get(appointment.patientId)

			return {
				id: appointment.appointmentId,
				patientId: appointment.patientId,
				doctorId: appointment.doctorId,
				requestedDate: appointment.requestedDate instanceof Date
					? appointment.requestedDate.toISOString()
					: appointment.requestedDate,
				requestedTime: appointment.requestedTime,
				reason: appointment.reason,
				status: appointment.status,
				priority: appointment.priority,
				notes: appointment.notes,
				consultationId: appointment.consultationId,
				createdAt:
					appointment.createdAt instanceof Date
						? appointment.createdAt.toISOString()
						: appointment.createdAt,
				updatedAt:
					appointment.updatedAt instanceof Date
						? appointment.updatedAt.toISOString()
						: appointment.updatedAt,
				doctor: {
					id: appointment.doctorId,
					email: appointment.doctorEmail,
					doctorInfo: {
						firstName: appointment.doctorFirstName,
						lastName: appointment.doctorLastName,
						specialization: appointment.doctorSpecialization,
					},
				},
				patient: patient
					? {
							id: patient.userId,
							email: patient.email,
							patientInfo: {
								firstName: patient.patientFirstName,
								middleName: patient.patientMiddleName,
								lastName: patient.patientLastName,
							},
						}
					: null,
			}
		})

		// Get total count
		const countResult = await this.db
			.select({ count: sql<number>`count(*)::int`.as("count") })
			.from(appointmentRequests)
			.where(whereCondition)

		const total = countResult[0]?.count || 0

		return {
			items: appointments,
			total,
			page: pageNum,
			limit: limitNum,
			totalPages: Math.ceil(total / limitNum) || 1,
		}
	}

	async getAvailableDoctors() {
		const doctors = await this.db
			.select({
				id: users.id,
				email: users.email,
				firstName: doctorInfos.firstName,
				lastName: doctorInfos.lastName,
				specialization: doctorInfos.specialization,
			})
			.from(users)
			.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
			.where(eq(users.role, "DOCTOR" as const))
	
		return doctors.map(doctor => ({
			id: doctor.id,
			name: `${doctor.firstName} ${doctor.lastName}`,
			specialization: doctor.specialization || 'General Practice',
		}))
	}
}
