import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { count, eq } from "drizzle-orm"

import { organizations, users } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class OrganizationsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll() {
		const orgs = await this.db.select().from(organizations)
		
		// Convert Date objects to ISO strings for serialization
		return orgs.map(org => ({
			...org,
			createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : org.createdAt,
			updatedAt: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : org.updatedAt,
			subscriptionStartDate: org.subscriptionStartDate instanceof Date 
				? org.subscriptionStartDate.toISOString() 
				: org.subscriptionStartDate,
			subscriptionEndDate: org.subscriptionEndDate instanceof Date 
				? org.subscriptionEndDate.toISOString() 
				: org.subscriptionEndDate,
			approvalStatusUpdatedAt: org.approvalStatusUpdatedAt instanceof Date 
				? org.approvalStatusUpdatedAt.toISOString() 
				: org.approvalStatusUpdatedAt,
		}))
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(organizations)
			.where(eq(organizations.id, id))
			.limit(1)
		if (!result) {
			throw new NotFoundException(`Organization with ID ${id} not found`)
		}
		
		// Convert Date objects to ISO strings for serialization
		return {
			...result,
			createdAt: result.createdAt instanceof Date ? result.createdAt.toISOString() : result.createdAt,
			updatedAt: result.updatedAt instanceof Date ? result.updatedAt.toISOString() : result.updatedAt,
			subscriptionStartDate: result.subscriptionStartDate instanceof Date 
				? result.subscriptionStartDate.toISOString() 
				: result.subscriptionStartDate,
			subscriptionEndDate: result.subscriptionEndDate instanceof Date 
				? result.subscriptionEndDate.toISOString() 
				: result.subscriptionEndDate,
			approvalStatusUpdatedAt: result.approvalStatusUpdatedAt instanceof Date 
				? result.approvalStatusUpdatedAt.toISOString() 
				: result.approvalStatusUpdatedAt,
		}
	}

	async create(data: any) {
		if (!data.name) {
			throw new BadRequestException("Organization name is required")
		}

		const [organization] = await this.db
			.insert(organizations)
			.values({
				name: data.name,
				description: data.description || null,
				address: data.address || null,
				phone: data.phone || null,
				email: data.email || null,
				website: data.website || null,
				subscriptionTier: (data.subscriptionTier || "FREE") as any,
				maxDoctors: data.maxDoctors || null,
				maxPatientsPerDoctor: data.maxPatientsPerDoctor || null,
				maxFaceScansPerDoctor: data.maxFaceScansPerDoctor || null,
				subscriptionStartDate: data.subscriptionStartDate
					? new Date(data.subscriptionStartDate)
					: null,
				subscriptionEndDate: data.subscriptionEndDate
					? new Date(data.subscriptionEndDate)
					: null,
				isActive: true,
				isSubscriptionActive: true,
				approvalStatus: "PENDING" as any,
			})
			.returning()

		if (!organization) {
			throw new BadRequestException("Failed to create organization")
		}

		// Convert Date objects to ISO strings for serialization
		return {
			...organization,
			createdAt: organization.createdAt instanceof Date ? organization.createdAt.toISOString() : organization.createdAt,
			updatedAt: organization.updatedAt instanceof Date ? organization.updatedAt.toISOString() : organization.updatedAt,
			subscriptionStartDate: organization.subscriptionStartDate instanceof Date 
				? organization.subscriptionStartDate.toISOString() 
				: organization.subscriptionStartDate,
			subscriptionEndDate: organization.subscriptionEndDate instanceof Date 
				? organization.subscriptionEndDate.toISOString() 
				: organization.subscriptionEndDate,
			approvalStatusUpdatedAt: organization.approvalStatusUpdatedAt instanceof Date 
				? organization.approvalStatusUpdatedAt.toISOString() 
				: organization.approvalStatusUpdatedAt,
		}
	}

	async update(id: string, data: any) {
		// Verify organization exists
		const [existing] = await this.db
			.select()
			.from(organizations)
			.where(eq(organizations.id, id))
			.limit(1)
		
		if (!existing) {
			throw new NotFoundException(`Organization with ID ${id} not found`)
		}

		const [organization] = await this.db
			.update(organizations)
			.set({
				name: data.name,
				description: data.description !== undefined ? data.description : undefined,
				address: data.address !== undefined ? data.address : undefined,
				phone: data.phone !== undefined ? data.phone : undefined,
				email: data.email !== undefined ? data.email : undefined,
				website: data.website !== undefined ? data.website : undefined,
				subscriptionTier: data.subscriptionTier ? (data.subscriptionTier as any) : undefined,
				maxDoctors: data.maxDoctors !== undefined ? data.maxDoctors : undefined,
				maxPatientsPerDoctor:
					data.maxPatientsPerDoctor !== undefined ? data.maxPatientsPerDoctor : undefined,
				maxFaceScansPerDoctor:
					data.maxFaceScansPerDoctor !== undefined ? data.maxFaceScansPerDoctor : undefined,
				isActive: data.isActive !== undefined ? data.isActive : undefined,
				subscriptionStartDate:
					data.subscriptionStartDate !== undefined
						? new Date(data.subscriptionStartDate)
						: undefined,
				subscriptionEndDate:
					data.subscriptionEndDate !== undefined
						? new Date(data.subscriptionEndDate)
						: undefined,
				updatedAt: new Date(),
			})
			.where(eq(organizations.id, id))
			.returning()

		if (!organization) {
			throw new NotFoundException(`Organization with ID ${id} not found`)
		}

		// Convert Date objects to ISO strings for serialization
		return {
			...organization,
			createdAt: organization.createdAt instanceof Date ? organization.createdAt.toISOString() : organization.createdAt,
			updatedAt: organization.updatedAt instanceof Date ? organization.updatedAt.toISOString() : organization.updatedAt,
			subscriptionStartDate: organization.subscriptionStartDate instanceof Date 
				? organization.subscriptionStartDate.toISOString() 
				: organization.subscriptionStartDate,
			subscriptionEndDate: organization.subscriptionEndDate instanceof Date 
				? organization.subscriptionEndDate.toISOString() 
				: organization.subscriptionEndDate,
			approvalStatusUpdatedAt: organization.approvalStatusUpdatedAt instanceof Date 
				? organization.approvalStatusUpdatedAt.toISOString() 
				: organization.approvalStatusUpdatedAt,
		}
	}

	async delete(id: string) {
		// Verify organization exists
		await this.findOne(id)

		await this.db.delete(organizations).where(eq(organizations.id, id))
	}

	async toggleStatus(id: string, isActive: boolean) {
		// Verify organization exists
		const [existing] = await this.db
			.select()
			.from(organizations)
			.where(eq(organizations.id, id))
			.limit(1)
		
		if (!existing) {
			throw new NotFoundException(`Organization with ID ${id} not found`)
		}

		const [organization] = await this.db
			.update(organizations)
			.set({
				isActive,
				updatedAt: new Date(),
			})
			.where(eq(organizations.id, id))
			.returning()

		if (!organization) {
			throw new NotFoundException(`Organization with ID ${id} not found`)
		}

		// Convert Date objects to ISO strings for serialization
		return {
			...organization,
			createdAt: organization.createdAt instanceof Date ? organization.createdAt.toISOString() : organization.createdAt,
			updatedAt: organization.updatedAt instanceof Date ? organization.updatedAt.toISOString() : organization.updatedAt,
			subscriptionStartDate: organization.subscriptionStartDate instanceof Date 
				? organization.subscriptionStartDate.toISOString() 
				: organization.subscriptionStartDate,
			subscriptionEndDate: organization.subscriptionEndDate instanceof Date 
				? organization.subscriptionEndDate.toISOString() 
				: organization.subscriptionEndDate,
			approvalStatusUpdatedAt: organization.approvalStatusUpdatedAt instanceof Date 
				? organization.approvalStatusUpdatedAt.toISOString() 
				: organization.approvalStatusUpdatedAt,
		}
	}

	async approve(id: string, userId?: string) {
		const [organization] = await this.db
			.update(organizations)
			.set({
				approvalStatus: "APPROVED" as any,
				approvalStatusUpdatedBy: userId || null,
				approvalStatusUpdatedAt: new Date(),
				approvalRejectionReason: null,
				updatedAt: new Date(),
			})
			.where(eq(organizations.id, id))
			.returning()

		if (!organization) {
			throw new NotFoundException(`Organization with ID ${id} not found`)
		}

		// Convert Date objects to ISO strings for serialization
		return {
			...organization,
			createdAt: organization.createdAt instanceof Date ? organization.createdAt.toISOString() : organization.createdAt,
			updatedAt: organization.updatedAt instanceof Date ? organization.updatedAt.toISOString() : organization.updatedAt,
			subscriptionStartDate: organization.subscriptionStartDate instanceof Date 
				? organization.subscriptionStartDate.toISOString() 
				: organization.subscriptionStartDate,
			subscriptionEndDate: organization.subscriptionEndDate instanceof Date 
				? organization.subscriptionEndDate.toISOString() 
				: organization.subscriptionEndDate,
			approvalStatusUpdatedAt: organization.approvalStatusUpdatedAt instanceof Date 
				? organization.approvalStatusUpdatedAt.toISOString() 
				: organization.approvalStatusUpdatedAt,
		}
	}

	async reject(id: string, reason?: string, userId?: string) {
		const [organization] = await this.db
			.update(organizations)
			.set({
				approvalStatus: "REJECTED" as any,
				approvalStatusUpdatedBy: userId || null,
				approvalStatusUpdatedAt: new Date(),
				approvalRejectionReason: reason || null,
				updatedAt: new Date(),
			})
			.where(eq(organizations.id, id))
			.returning()

		if (!organization) {
			throw new NotFoundException(`Organization with ID ${id} not found`)
		}

		// Convert Date objects to ISO strings for serialization
		return {
			...organization,
			createdAt: organization.createdAt instanceof Date ? organization.createdAt.toISOString() : organization.createdAt,
			updatedAt: organization.updatedAt instanceof Date ? organization.updatedAt.toISOString() : organization.updatedAt,
			subscriptionStartDate: organization.subscriptionStartDate instanceof Date 
				? organization.subscriptionStartDate.toISOString() 
				: organization.subscriptionStartDate,
			subscriptionEndDate: organization.subscriptionEndDate instanceof Date 
				? organization.subscriptionEndDate.toISOString() 
				: organization.subscriptionEndDate,
			approvalStatusUpdatedAt: organization.approvalStatusUpdatedAt instanceof Date 
				? organization.approvalStatusUpdatedAt.toISOString() 
				: organization.approvalStatusUpdatedAt,
		}
	}

	async getStatistics() {
		// Get total organizations
		const [totalResult] = await this.db.select({ count: count() }).from(organizations)
		const totalOrganizations = totalResult?.count || 0

		// Get active organizations
		const [activeResult] = await this.db
			.select({ count: count() })
			.from(organizations)
			.where(eq(organizations.isActive, true))
		const activeOrganizations = activeResult?.count || 0

		// Get total doctors across all organizations
		const [doctorsResult] = await this.db
			.select({ count: count() })
			.from(users)
			.where(eq(users.role, "DOCTOR" as const))
		const totalDoctors = doctorsResult?.count || 0

		// Get total patients
		const [patientsResult] = await this.db
			.select({ count: count() })
			.from(users)
			.where(eq(users.role, "PATIENT" as const))
		const totalPatients = patientsResult?.count || 0

		return {
			totalOrganizations,
			activeOrganizations,
			totalDoctors,
			totalPatients,
		}
	}
}
