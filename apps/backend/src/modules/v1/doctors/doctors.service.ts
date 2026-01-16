import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { and, eq, inArray, sql } from "drizzle-orm"
import * as bcrypt from "bcryptjs"

import { doctorInfos, organizations, subscriptionTierSettings, users } from "@repo/db/schema"
import type { SubscriptionTier, SubscriptionEntityType } from "@repo/db/schema"

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

	async approve(id: string, userId?: string) {
		// First verify the doctor exists
		const [existing] = await this.db
			.select()
			.from(doctorInfos)
			.where(eq(doctorInfos.userId, id))
			.limit(1)

		if (!existing) {
			throw new NotFoundException(`Doctor with ID ${id} not found`)
		}

		// Update approval status
		const [doctorInfo] = await this.db
			.update(doctorInfos)
			.set({
				approvalStatus: "APPROVED" as any,
				approvalStatusUpdatedBy: userId || null,
				approvalStatusUpdatedAt: new Date(),
				approvalRejectionReason: null,
			})
			.where(eq(doctorInfos.userId, id))
			.returning()

		if (!doctorInfo) {
			throw new NotFoundException(`Doctor with ID ${id} not found`)
		}

		// Return the updated doctor using findOne to get the full formatted response
		return this.findOne(id)
	}

	async reject(id: string, reason?: string, userId?: string) {
		// First verify the doctor exists
		const [existing] = await this.db
			.select()
			.from(doctorInfos)
			.where(eq(doctorInfos.userId, id))
			.limit(1)

		if (!existing) {
			throw new NotFoundException(`Doctor with ID ${id} not found`)
		}

		// Update approval status
		const [doctorInfo] = await this.db
			.update(doctorInfos)
			.set({
				approvalStatus: "REJECTED" as any,
				approvalStatusUpdatedBy: userId || null,
				approvalStatusUpdatedAt: new Date(),
				approvalRejectionReason: reason || null,
			})
			.where(eq(doctorInfos.userId, id))
			.returning()

		if (!doctorInfo) {
			throw new NotFoundException(`Doctor with ID ${id} not found`)
		}

		// Return the updated doctor using findOne to get the full formatted response
		return this.findOne(id)
	}

	async update(id: string, data: {
		organizationId?: string | null
		firstName?: string
		middleName?: string
		lastName?: string
		specialization?: string
		qualifications?: string
		experience?: number
		contactNumber?: string
		address?: string
		bio?: string
	}) {
		// First verify the doctor exists and get current organizationId
		const [existingUser] = await this.db
			.select({ organizationId: users.organizationId })
			.from(users)
			.where(eq(users.id, id))
			.limit(1)

		if (!existingUser) {
			throw new NotFoundException(`Doctor with ID ${id} not found`)
		}

		const [existing] = await this.db
			.select()
			.from(doctorInfos)
			.where(eq(doctorInfos.userId, id))
			.limit(1)

		if (!existing) {
			throw new NotFoundException(`Doctor with ID ${id} not found`)
		}

		// Prepare update data for doctorInfo
		const doctorInfoUpdate: any = {}
		if (data.firstName !== undefined) doctorInfoUpdate.firstName = data.firstName
		if (data.middleName !== undefined) doctorInfoUpdate.middleName = data.middleName
		if (data.lastName !== undefined) doctorInfoUpdate.lastName = data.lastName
		if (data.specialization !== undefined) doctorInfoUpdate.specialization = data.specialization
		if (data.qualifications !== undefined) doctorInfoUpdate.qualifications = data.qualifications
		if (data.experience !== undefined) doctorInfoUpdate.experience = data.experience
		if (data.contactNumber !== undefined) doctorInfoUpdate.contactNumber = data.contactNumber
		if (data.address !== undefined) doctorInfoUpdate.address = data.address
		if (data.bio !== undefined) doctorInfoUpdate.bio = data.bio

		// Update doctorInfo if there are fields to update
		if (Object.keys(doctorInfoUpdate).length > 0) {
			await this.db
				.update(doctorInfos)
				.set(doctorInfoUpdate)
				.where(eq(doctorInfos.userId, id))
		}

		// Update user's organizationId if provided and update currentDoctors counts
		if (data.organizationId !== undefined) {
			const oldOrganizationId = existingUser.organizationId
			const newOrganizationId = data.organizationId

			// Update the user's organizationId
			await this.db
				.update(users)
				.set({ organizationId: newOrganizationId })
				.where(eq(users.id, id))

			// Update currentDoctors count for old organization (decrement)
			if (oldOrganizationId) {
				await this.db
					.update(organizations)
					.set({
						currentDoctors: sql`GREATEST(0, ${organizations.currentDoctors} - 1)`,
					})
					.where(eq(organizations.id, oldOrganizationId))
			}

			// Update currentDoctors count for new organization (increment)
			if (newOrganizationId) {
				await this.db
					.update(organizations)
					.set({
						currentDoctors: sql`${organizations.currentDoctors} + 1`,
					})
					.where(eq(organizations.id, newOrganizationId))
			}
		}

		// Return the updated doctor using findOne to get the full formatted response
		return this.findOne(id)
	}

	async delete(id: string) {
		// Verify doctor exists and get organizationId before deletion
		const [existing] = await this.db
			.select({
				userId: users.id,
				organizationId: users.organizationId,
			})
			.from(users)
			.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
			.where(and(eq(users.id, id), eq(users.role, "DOCTOR" as const)))
			.limit(1)

		if (!existing) {
			throw new NotFoundException(`Doctor with ID ${id} not found`)
		}

		const organizationId = existing.organizationId

		// Delete doctor info first (due to foreign key constraint)
		await this.db.delete(doctorInfos).where(eq(doctorInfos.userId, id))
		
		// Delete user
		await this.db.delete(users).where(eq(users.id, id))

		// Decrement currentDoctors count for the organization if doctor was assigned to one
		if (organizationId) {
			await this.db
				.update(organizations)
				.set({
					currentDoctors: sql`GREATEST(0, ${organizations.currentDoctors} - 1)`,
				})
				.where(eq(organizations.id, organizationId))
		}
	}

	async create(data: {
		email: string
		password: string
		organizationId?: string | null
		firstName: string
		middleName?: string
		lastName: string
		gender?: string
		dateOfBirth?: string
		contactNumber: string
		address?: string
		bio?: string
		specialization: string
		qualifications: string
		experience: number
		subscriptionTier?: string
	}) {
		// Check if user with email already exists
		const [existing] = await this.db
			.select()
			.from(users)
			.where(eq(users.email, data.email))
			.limit(1)

		if (existing) {
			throw new ConflictException("User with this email already exists")
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(data.password, 10)

		// Get subscription tier settings
		const requestedTier = (data.subscriptionTier || "FREE") as SubscriptionTier
		const [tierSetting] = await this.db
			.select()
			.from(subscriptionTierSettings)
			.where(
				and(
					eq(subscriptionTierSettings.tier, requestedTier),
					eq(subscriptionTierSettings.entityType, "DOCTOR" as SubscriptionEntityType)
				)
			)
			.limit(1)

		const appliedTier = tierSetting?.tier || ("FREE" as SubscriptionTier)

		// Create user
		const [user] = await this.db
			.insert(users)
			.values({
				name: `${data.firstName} ${data.lastName}`.trim() || data.email.split("@")[0] || "Doctor",
				email: data.email,
				password: hashedPassword,
				emailVerified: false,
				role: "DOCTOR" as any,
				organizationId: data.organizationId || null,
			})
			.returning()

		if (!user) {
			throw new BadRequestException("Failed to create user")
		}

		// Create doctor info
		await this.db.insert(doctorInfos).values({
			userId: user.id,
			firstName: data.firstName,
			middleName: data.middleName || null,
			lastName: data.lastName,
			gender: (data.gender || "OTHER") as any,
			dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date(),
			contactNumber: data.contactNumber,
			address: data.address || "",
			bio: data.bio || "",
			specialization: data.specialization,
			qualifications: data.qualifications,
			experience: data.experience,
			approvalStatus: "PENDING" as any,
			subscriptionTier: appliedTier,
			maxPatients: tierSetting?.maxPatients || null,
			maxFaceScans: tierSetting?.maxFaceScans || null,
			subscriptionStartDate: new Date(),
			isSubscriptionActive: true,
		})

		// Increment currentDoctors count for the organization if doctor was assigned to one
		if (data.organizationId) {
			await this.db
				.update(organizations)
				.set({
					currentDoctors: sql`${organizations.currentDoctors} + 1`,
				})
				.where(eq(organizations.id, data.organizationId))
		}

		// Return the created doctor using findOne to get the full formatted response
		return this.findOne(user.id)
	}
}
