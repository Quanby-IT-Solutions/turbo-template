import { Inject, Injectable } from "@nestjs/common"
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
}
