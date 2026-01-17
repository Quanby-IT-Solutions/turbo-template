import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"

import { doctorInfos, organizations, patientInfos, users } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class SubscriptionsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async getAllSubscriptions(type?: string, tier?: string, activeOnly?: boolean) {
		const result: {
			organizations: any[]
			doctors: any[]
			patients: any[]
		} = {
			organizations: [],
			doctors: [],
			patients: [],
		}

		// Build where conditions
		const orgConditions: any[] = []
		const doctorConditions: any[] = []
		const patientConditions: any[] = []

		if (tier) {
			orgConditions.push(eq(organizations.subscriptionTier, tier as any))
			doctorConditions.push(eq(doctorInfos.subscriptionTier, tier as any))
			patientConditions.push(eq(patientInfos.subscriptionTier, tier as any))
		}

		if (activeOnly) {
			orgConditions.push(eq(organizations.isSubscriptionActive, true))
			doctorConditions.push(eq(doctorInfos.isSubscriptionActive, true))
			patientConditions.push(eq(patientInfos.isSubscriptionActive, true))
		}

		// Fetch organizations
		if (!type || type === "organization") {
			const orgs = await this.db
				.select({
					id: organizations.id,
					name: organizations.name,
					subscriptionTier: organizations.subscriptionTier,
					maxDoctors: organizations.maxDoctors,
					maxPatientsPerDoctor: organizations.maxPatientsPerDoctor,
					maxFaceScansPerDoctor: organizations.maxFaceScansPerDoctor,
					currentDoctors: organizations.currentDoctors,
					subscriptionStartDate: organizations.subscriptionStartDate,
					subscriptionEndDate: organizations.subscriptionEndDate,
					isSubscriptionActive: organizations.isSubscriptionActive,
				})
				.from(organizations)
				.where(orgConditions.length > 0 ? and(...orgConditions) : undefined)
				.orderBy(asc(organizations.name))

			// Get doctor counts for each organization
			const orgIds = orgs.map(org => org.id)
			const countMap = new Map<string, number>()

			if (orgIds.length > 0) {
				const counts = await this.db
					.select({
						organizationId: users.organizationId,
						count: sql<number>`count(*)::int`.as("count"),
					})
					.from(users)
					.where(
						and(
							inArray(users.organizationId, orgIds.filter(id => id !== null) as string[]),
							eq(users.role, "DOCTOR" as const)
						)
					)
					.groupBy(users.organizationId)

				counts.forEach(c => {
					if (c.organizationId) {
						countMap.set(c.organizationId, Number(c.count))
					}
				})
			}

			result.organizations = orgs.map(org => ({
				id: org.id,
				name: org.name,
				subscriptionTier: org.subscriptionTier,
				maxDoctors: org.maxDoctors,
				maxPatientsPerDoctor: org.maxPatientsPerDoctor,
				maxFaceScansPerDoctor: org.maxFaceScansPerDoctor,
				currentDoctors: org.currentDoctors,
				subscriptionStartDate: org.subscriptionStartDate,
				subscriptionEndDate: org.subscriptionEndDate,
				isSubscriptionActive: org.isSubscriptionActive,
				_count: {
					users: countMap.get(org.id) || 0,
				},
			}))
		}

		// Fetch doctors
		if (!type || type === "doctor") {
			const doctorsData = await this.db
				.select({
					doctorId: doctorInfos.id,
					userId: doctorInfos.userId,
					firstName: doctorInfos.firstName,
					lastName: doctorInfos.lastName,
					subscriptionTier: doctorInfos.subscriptionTier,
					maxPatients: doctorInfos.maxPatients,
					currentPatients: doctorInfos.currentPatients,
					maxFaceScans: doctorInfos.maxFaceScans,
					currentFaceScans: doctorInfos.currentFaceScans,
					subscriptionStartDate: doctorInfos.subscriptionStartDate,
					subscriptionEndDate: doctorInfos.subscriptionEndDate,
					isSubscriptionActive: doctorInfos.isSubscriptionActive,
					userEmail: users.email,
					userCreatedAt: users.createdAt,
					userOrganizationId: users.organizationId,
					orgId: organizations.id,
					orgName: organizations.name,
				})
				.from(doctorInfos)
				.innerJoin(users, eq(doctorInfos.userId, users.id))
				.leftJoin(organizations, eq(users.organizationId, organizations.id))
				.where(doctorConditions.length > 0 ? and(...doctorConditions) : undefined)
				.orderBy(desc(users.createdAt))

			result.doctors = doctorsData.map(doctor => ({
				id: doctor.doctorId,
				userId: doctor.userId,
				firstName: doctor.firstName,
				lastName: doctor.lastName,
				subscriptionTier: doctor.subscriptionTier,
				maxPatients: doctor.maxPatients,
				currentPatients: doctor.currentPatients,
				maxFaceScans: doctor.maxFaceScans,
				currentFaceScans: doctor.currentFaceScans,
				subscriptionStartDate: doctor.subscriptionStartDate,
				subscriptionEndDate: doctor.subscriptionEndDate,
				isSubscriptionActive: doctor.isSubscriptionActive,
				user: {
					id: doctor.userId,
					email: doctor.userEmail,
					organizationId: doctor.userOrganizationId,
					organization: doctor.orgId
						? {
								id: doctor.orgId,
								name: doctor.orgName,
							}
						: null,
				},
			}))
		}

		// Fetch patients
		if (!type || type === "patient") {
			const patientsData = await this.db
				.select({
					patientId: patientInfos.id,
					userId: patientInfos.userId,
					firstName: patientInfos.firstName,
					lastName: patientInfos.lastName,
					subscriptionTier: patientInfos.subscriptionTier,
					maxFaceScans: patientInfos.maxFaceScans,
					currentFaceScans: patientInfos.currentFaceScans,
					subscriptionStartDate: patientInfos.subscriptionStartDate,
					subscriptionEndDate: patientInfos.subscriptionEndDate,
					isSubscriptionActive: patientInfos.isSubscriptionActive,
					userEmail: users.email,
					userCreatedAt: users.createdAt,
				})
				.from(patientInfos)
				.innerJoin(users, eq(patientInfos.userId, users.id))
				.where(patientConditions.length > 0 ? and(...patientConditions) : undefined)
				.orderBy(desc(users.createdAt))

			result.patients = patientsData.map(patient => ({
				id: patient.patientId,
				userId: patient.userId,
				firstName: patient.firstName,
				lastName: patient.lastName,
				subscriptionTier: patient.subscriptionTier,
				maxFaceScans: patient.maxFaceScans,
				currentFaceScans: patient.currentFaceScans,
				subscriptionStartDate: patient.subscriptionStartDate,
				subscriptionEndDate: patient.subscriptionEndDate,
				isSubscriptionActive: patient.isSubscriptionActive,
				user: {
					id: patient.userId,
					email: patient.userEmail,
				},
			}))
		}

		return result
	}

	async updateOrganizationSubscription(
		organizationId: string,
		data: {
			subscriptionTier?: string
			maxDoctors?: number | null
			maxPatientsPerDoctor?: number | null
			maxFaceScansPerDoctor?: number | null
			subscriptionStartDate?: string
			subscriptionEndDate?: string
			isSubscriptionActive?: boolean
		}
	) {
		// Verify organization exists
		const [existing] = await this.db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1)

		if (!existing) {
			throw new NotFoundException(`Organization with ID ${organizationId} not found`)
		}

		const updateData: any = {}

		if (data.subscriptionTier !== undefined) {
			updateData.subscriptionTier = data.subscriptionTier
		}
		if (data.maxDoctors !== undefined) {
			updateData.maxDoctors = data.maxDoctors
		}
		if (data.maxPatientsPerDoctor !== undefined) {
			updateData.maxPatientsPerDoctor = data.maxPatientsPerDoctor
		}
		if (data.maxFaceScansPerDoctor !== undefined) {
			updateData.maxFaceScansPerDoctor = data.maxFaceScansPerDoctor
		}
		if (data.subscriptionStartDate !== undefined) {
			updateData.subscriptionStartDate = data.subscriptionStartDate
				? new Date(data.subscriptionStartDate)
				: null
		}
		if (data.subscriptionEndDate !== undefined) {
			updateData.subscriptionEndDate = data.subscriptionEndDate
				? new Date(data.subscriptionEndDate)
				: null
		}
		if (data.isSubscriptionActive !== undefined) {
			updateData.isSubscriptionActive = data.isSubscriptionActive
		}

		// Always update the updatedAt timestamp
		updateData.updatedAt = new Date()

		const [updated] = await this.db
			.update(organizations)
			.set(updateData)
			.where(eq(organizations.id, organizationId))
			.returning({
				id: organizations.id,
				name: organizations.name,
				subscriptionTier: organizations.subscriptionTier,
				maxDoctors: organizations.maxDoctors,
				maxPatientsPerDoctor: organizations.maxPatientsPerDoctor,
				maxFaceScansPerDoctor: organizations.maxFaceScansPerDoctor,
				currentDoctors: organizations.currentDoctors,
				subscriptionStartDate: organizations.subscriptionStartDate,
				subscriptionEndDate: organizations.subscriptionEndDate,
				isSubscriptionActive: organizations.isSubscriptionActive,
			})

		if (!updated) {
			throw new NotFoundException(`Organization with ID ${organizationId} not found`)
		}

		return {
			id: updated.id,
			name: updated.name,
			subscriptionTier: updated.subscriptionTier,
			maxDoctors: updated.maxDoctors,
			maxPatientsPerDoctor: updated.maxPatientsPerDoctor,
			maxFaceScansPerDoctor: updated.maxFaceScansPerDoctor,
			currentDoctors: updated.currentDoctors,
			subscriptionStartDate: updated.subscriptionStartDate,
			subscriptionEndDate: updated.subscriptionEndDate,
			isSubscriptionActive: updated.isSubscriptionActive,
		}
	}

	async updateDoctorSubscription(
		doctorId: string,
		data: {
			subscriptionTier?: string
			maxPatients?: number | null
			maxFaceScans?: number | null
			subscriptionStartDate?: string
			subscriptionEndDate?: string
			isSubscriptionActive?: boolean
		}
	) {
		// Verify doctor exists by userId (since the frontend passes userId)
		const [existing] = await this.db
			.select()
			.from(doctorInfos)
			.where(eq(doctorInfos.userId, doctorId))
			.limit(1)

		if (!existing) {
			throw new NotFoundException(`Doctor with user ID ${doctorId} not found`)
		}

		const updateData: any = {}

		if (data.subscriptionTier !== undefined) {
			updateData.subscriptionTier = data.subscriptionTier
		}
		if (data.maxPatients !== undefined) {
			updateData.maxPatients = data.maxPatients
		}
		if (data.maxFaceScans !== undefined) {
			updateData.maxFaceScans = data.maxFaceScans
		}
		if (data.subscriptionStartDate !== undefined) {
			updateData.subscriptionStartDate = data.subscriptionStartDate
				? new Date(data.subscriptionStartDate)
				: null
		}
		if (data.subscriptionEndDate !== undefined) {
			updateData.subscriptionEndDate = data.subscriptionEndDate
				? new Date(data.subscriptionEndDate)
				: null
		}
		if (data.isSubscriptionActive !== undefined) {
			updateData.isSubscriptionActive = data.isSubscriptionActive
		}

		const [updated] = await this.db
			.update(doctorInfos)
			.set(updateData)
			.where(eq(doctorInfos.userId, doctorId))
			.returning({
				id: doctorInfos.id,
				userId: doctorInfos.userId,
				firstName: doctorInfos.firstName,
				lastName: doctorInfos.lastName,
				subscriptionTier: doctorInfos.subscriptionTier,
				maxPatients: doctorInfos.maxPatients,
				currentPatients: doctorInfos.currentPatients,
				maxFaceScans: doctorInfos.maxFaceScans,
				currentFaceScans: doctorInfos.currentFaceScans,
				subscriptionStartDate: doctorInfos.subscriptionStartDate,
				subscriptionEndDate: doctorInfos.subscriptionEndDate,
				isSubscriptionActive: doctorInfos.isSubscriptionActive,
			})

		if (!updated) {
			throw new NotFoundException(`Doctor with user ID ${doctorId} not found`)
		}

		// Get user and organization info
		const [userData] = await this.db
			.select({
				userId: users.id,
				email: users.email,
				organizationId: users.organizationId,
				orgId: organizations.id,
				orgName: organizations.name,
			})
			.from(users)
			.leftJoin(organizations, eq(users.organizationId, organizations.id))
			.where(eq(users.id, doctorId))
			.limit(1)

		return {
			id: updated.id,
			userId: updated.userId,
			firstName: updated.firstName,
			lastName: updated.lastName,
			subscriptionTier: updated.subscriptionTier,
			maxPatients: updated.maxPatients,
			currentPatients: updated.currentPatients,
			maxFaceScans: updated.maxFaceScans,
			currentFaceScans: updated.currentFaceScans,
			subscriptionStartDate: updated.subscriptionStartDate,
			subscriptionEndDate: updated.subscriptionEndDate,
			isSubscriptionActive: updated.isSubscriptionActive,
			user: {
				id: userData?.userId || updated.userId,
				email: userData?.email || "",
				organizationId: userData?.organizationId || null,
				organization: userData?.orgId
					? {
							id: userData.orgId,
							name: userData.orgName || "",
						}
					: null,
			},
		}
	}

	async updatePatientSubscription(
		patientId: string,
		data: {
			subscriptionTier?: string
			maxFaceScans?: number | null
			subscriptionStartDate?: string
			subscriptionEndDate?: string
			isSubscriptionActive?: boolean
		}
	) {
		// Verify patient exists by userId (since the frontend passes userId)
		const [existing] = await this.db
			.select()
			.from(patientInfos)
			.where(eq(patientInfos.userId, patientId))
			.limit(1)

		if (!existing) {
			throw new NotFoundException(`Patient with user ID ${patientId} not found`)
		}

		const updateData: any = {}

		if (data.subscriptionTier !== undefined) {
			updateData.subscriptionTier = data.subscriptionTier
		}
		if (data.maxFaceScans !== undefined) {
			updateData.maxFaceScans = data.maxFaceScans
		}
		if (data.subscriptionStartDate !== undefined) {
			updateData.subscriptionStartDate = data.subscriptionStartDate
				? new Date(data.subscriptionStartDate)
				: null
		}
		if (data.subscriptionEndDate !== undefined) {
			updateData.subscriptionEndDate = data.subscriptionEndDate
				? new Date(data.subscriptionEndDate)
				: null
		}
		if (data.isSubscriptionActive !== undefined) {
			updateData.isSubscriptionActive = data.isSubscriptionActive
		}

		const [updated] = await this.db
			.update(patientInfos)
			.set(updateData)
			.where(eq(patientInfos.userId, patientId))
			.returning({
				id: patientInfos.id,
				userId: patientInfos.userId,
				firstName: patientInfos.firstName,
				lastName: patientInfos.lastName,
				subscriptionTier: patientInfos.subscriptionTier,
				maxFaceScans: patientInfos.maxFaceScans,
				currentFaceScans: patientInfos.currentFaceScans,
				subscriptionStartDate: patientInfos.subscriptionStartDate,
				subscriptionEndDate: patientInfos.subscriptionEndDate,
				isSubscriptionActive: patientInfos.isSubscriptionActive,
			})

		if (!updated) {
			throw new NotFoundException(`Patient with user ID ${patientId} not found`)
		}

		// Get user info
		const [userData] = await this.db
			.select({
				userId: users.id,
				email: users.email,
			})
			.from(users)
			.where(eq(users.id, patientId))
			.limit(1)

		return {
			id: updated.id,
			userId: updated.userId,
			firstName: updated.firstName,
			lastName: updated.lastName,
			subscriptionTier: updated.subscriptionTier,
			maxFaceScans: updated.maxFaceScans,
			currentFaceScans: updated.currentFaceScans,
			subscriptionStartDate: updated.subscriptionStartDate,
			subscriptionEndDate: updated.subscriptionEndDate,
			isSubscriptionActive: updated.isSubscriptionActive,
			user: {
				id: userData?.userId || updated.userId,
				email: userData?.email || "",
			},
		}
	}
}
