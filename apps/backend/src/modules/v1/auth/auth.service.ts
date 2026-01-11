import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common"
import { and, eq } from "drizzle-orm"
import * as bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

import { auth } from "@repo/auth"
import {
	account,
	adminInfos,
	doctorInfos,
	emergencyContacts,
	insuranceInfos,
	organizations,
	patientInfos,
	session as sessionTable,
	subscriptionTierSettings,
	users,
} from "@repo/db/schema"
import type { Role, SubscriptionTier, SubscriptionEntityType } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"
import { LoginDto, RegisterDto } from "@repo/contracts"

import { BetterAuthService } from "./better-auth.service"

@Injectable()
export class AuthService {
	constructor(
		@Inject(DB) private readonly db: DBType,
		@Inject(BetterAuthService) private readonly betterAuthService: BetterAuthService
	) {}

	validatePasswordStrength(password: string): boolean {
		if (password.length < 8) return false
		if (!/[A-Z]/.test(password)) return false
		if (!/[a-z]/.test(password)) return false
		if (!/\d/.test(password)) return false
		if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false
		return true
	}

	async login(loginDto: LoginDto) {
		const { email, password } = loginDto

		// Use Better Auth ONLY - no JWT tokens
		const authInstance = this.betterAuthService.getAuthInstance()

		try {
			// First check user in our existing User table for role/approval checks
			const [user] = await this.db
				.select()
				.from(users)
				.where(eq(users.email, email))
				.limit(1)

			if (!user) {
				throw new UnauthorizedException("Invalid email or password")
			}

			// Get related info for approval checks
			const [doctorInfo] =
				user.role === "DOCTOR"
					? await this.db.select().from(doctorInfos).where(eq(doctorInfos.userId, user.id)).limit(1)
					: [null]

			// Check doctor approval
			if (user.role === "DOCTOR" && doctorInfo) {
				if (doctorInfo.approvalStatus !== "APPROVED") {
					if (doctorInfo.approvalStatus === "PENDING") {
						throw new UnauthorizedException(
							"Your account is pending approval. Please wait for admin approval."
						)
					} else if (doctorInfo.approvalStatus === "REJECTED") {
						throw new UnauthorizedException(
							`Your account has been rejected. ${doctorInfo.approvalRejectionReason || "Please contact support for more information."}`
						)
					}
				}
			}

			// Check organization approval
			if (user.role === "ORGANIZATION" && user.organizationId) {
				const [organization] = await this.db
					.select()
					.from(organizations)
					.where(eq(organizations.id, user.organizationId))
					.limit(1)

				if (organization) {
					if (organization.approvalStatus !== "APPROVED") {
						if (organization.approvalStatus === "PENDING") {
							throw new UnauthorizedException(
								"Your organization is pending approval. Please wait for super admin approval."
							)
						} else if (organization.approvalStatus === "REJECTED") {
							throw new UnauthorizedException(
								`Your organization has been rejected. ${organization.approvalRejectionReason || "Please contact support for more information."}`
							)
						}
					}
					if (!organization.isActive || !organization.isSubscriptionActive) {
						throw new UnauthorizedException("Your organization is inactive. Please contact support.")
					}
				}
			}

			// Verify password with our existing User table first
			const isMatch = await bcrypt.compare(password, user.password)
			if (!isMatch) {
				throw new UnauthorizedException("Invalid email or password")
			}

			// Ensure Better Auth account exists and password is synced
			// Better Auth stores passwords in the account table, not the users table
			const [existingAccount] = await this.db
				.select()
				.from(account)
				.where(and(eq(account.userId, user.id), eq(account.providerId, "credential")))
				.limit(1)

			if (!existingAccount || !existingAccount.password) {
				// Create or update Better Auth account with the correct password hash
				const passwordHash = await bcrypt.hash(password, 10)
				if (existingAccount) {
					// Update existing account with password
					await this.db
						.update(account)
						.set({
							password: passwordHash,
							updatedAt: new Date(),
						})
						.where(eq(account.id, existingAccount.id))
				} else {
					// Create new account entry
					await this.db.insert(account).values({
						id: uuidv4(),
						accountId: email,
						providerId: "credential",
						userId: user.id,
						password: passwordHash,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
				}
			} else {
				// Verify the password in Better Auth account matches
				const accountPasswordMatch = await bcrypt.compare(password, existingAccount.password)
				if (!accountPasswordMatch) {
					// Update password in Better Auth account to match users table
					const passwordHash = await bcrypt.hash(password, 10)
					await this.db
						.update(account)
						.set({
							password: passwordHash,
							updatedAt: new Date(),
						})
						.where(eq(account.id, existingAccount.id))
				}
			}

			// Generate our own session token instead of relying on Better Auth's signInEmail
			// Better Auth's signInEmail doesn't reliably create sessions when called programmatically
			// We'll create the session directly in the database with our own token
			const sessionToken = uuidv4().replace(/-/g, "") // Remove dashes to get 32-char token
			
			console.error("🔑 Generated session token", { 
				tokenLength: sessionToken.length, 
				tokenPrefix: sessionToken.substring(0, 30),
				fullToken: sessionToken,
				userId: user.id,
			})

			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

			// Convert userId to string (Better Auth stores userId as text)
			const userIdString = String(user.id)

			// Check if Better Auth already created a session (it might have)
			// Better Auth might create sessions automatically when signInEmail is called
			console.error("🔍 Checking if session exists in database...", {
				tokenLength: sessionToken.length,
				tokenPrefix: sessionToken.substring(0, 30),
			})
			
			const [existingSessionByToken] = await this.db
				.select()
				.from(sessionTable)
				.where(eq(sessionTable.token, sessionToken))
				.limit(1)

			const [existingSessionById] = await this.db
				.select()
				.from(sessionTable)
				.where(eq(sessionTable.id, sessionToken))
				.limit(1)

			const existingSession = existingSessionByToken || existingSessionById
			
			if (existingSession) {
				console.error("✅ Session already exists in database (created by Better Auth)", {
					sessionId: existingSession.id.substring(0, 30),
					token: existingSession.token?.substring(0, 30),
					userId: existingSession.userId,
				})
			} else {
				console.error("⚠️ Session not found in database, will create manually...")
			}

			if (!existingSession) {
				// Create session in database
				try {
					await this.db.insert(sessionTable).values({
						id: sessionToken, // Use token as id (Better Auth pattern)
						token: sessionToken,
						userId: userIdString,
						expiresAt: expiresAt,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					console.error("✅ Session created successfully in database", { 
						sessionId: sessionToken.substring(0, 30), 
						fullToken: sessionToken,
						userId: userIdString,
						expiresAt: expiresAt.toISOString(),
					})
					
					// Verify the session was created
					const [verifySession] = await this.db
						.select()
						.from(sessionTable)
						.where(eq(sessionTable.id, sessionToken))
						.limit(1)
					
					if (!verifySession) {
						console.error("❌ Session creation failed - session not found after insert")
					} else {
						console.error("✅ Session verified in database", { 
							sessionId: verifySession.id,
							token: verifySession.token,
							tokenLength: verifySession.token?.length,
							userId: verifySession.userId,
						})
					}
				} catch (insertError: any) {
					// If insert fails (e.g., duplicate id), try update
					if (insertError?.code === "23505") {
						// Unique violation - update instead
						console.error("Session already exists (race condition), updating...")
						await this.db
							.update(sessionTable)
							.set({
								token: sessionToken,
								userId: userIdString,
								expiresAt: expiresAt,
								updatedAt: new Date(),
							})
							.where(eq(sessionTable.id, sessionToken))
						console.error("✅ Session updated successfully")
					} else {
						console.error("❌ Failed to create session:", insertError)
						throw insertError
					}
				}
			} else {
				// Update existing session expiration and userId (in case it changed)
				console.error("Session exists, updating expiration...")
				await this.db
					.update(sessionTable)
					.set({
						userId: userIdString,
						expiresAt: expiresAt,
						updatedAt: new Date(),
					})
					.where(eq(sessionTable.id, existingSession.id))
				console.error("✅ Session updated successfully")
			}

			// Get full user profile from our User table
			const userProfile = await this.getUserProfile(user.id)

			// Log what we're returning to frontend
			console.error("📤 Returning auth response to frontend", {
				sessionTokenLength: sessionToken.length,
				sessionTokenPrefix: sessionToken.substring(0, 30),
				userId: userProfile.id,
				userRole: userProfile.role,
			})

			// Return session with our generated token
			return {
				user: userProfile,
				session: {
					id: sessionToken,
					token: sessionToken,
					userId: String(user.id),
					expiresAt: expiresAt.toISOString(),
				},
				// Include session token for frontend - ensure it's the full token
				sessionToken: sessionToken,
			}
		} catch (error: any) {
			if (error instanceof UnauthorizedException) {
				throw error
			}
			throw new UnauthorizedException(error.message || "Login failed")
		}
	}

	async register(registerDto: RegisterDto) {
		const { email, password, role } = registerDto

		// Check if user exists
		const [existing] = await this.db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1)

		if (existing) {
			throw new ConflictException("User with this email already exists")
		}

		// Hash password for our User table
		const hashedPassword = await bcrypt.hash(password, 10)

		if (role === "PATIENT") {
			return this.registerPatient(registerDto, email, hashedPassword, password)
		} else if (role === "ORGANIZATION") {
			return this.registerOrganization(registerDto, email, hashedPassword, password)
		} else if (role === "DOCTOR") {
			return this.registerDoctor(registerDto, email, hashedPassword, password)
		} else {
			throw new BadRequestException("Invalid role specified")
		}
	}

	private async registerPatient(
		dto: RegisterDto,
		email: string,
		hashedPassword: string,
		originalPassword: string
	) {
		// Handle name fields
		let firstName: string
		let lastName: string
		const middleName = dto.middleName

		if (dto.fullName && !dto.firstName && !dto.lastName) {
			const nameParts = dto.fullName.trim().split(/\s+/)
			firstName = nameParts[0] || ""
			lastName = nameParts.slice(1).join(" ") || ""
		} else {
			firstName = dto.firstName!
			lastName = dto.lastName!
		}

		// Get subscription tier
		const requestedTier = (dto.subscriptionTier || "FREE") as SubscriptionTier
		const [tierSetting] = await this.db
			.select()
			.from(subscriptionTierSettings)
			.where(
				and(
					eq(subscriptionTierSettings.tier, requestedTier),
					eq(subscriptionTierSettings.entityType, "PATIENT" as SubscriptionEntityType)
				)
			)
			.limit(1)

		const appliedTier = tierSetting?.tier || ("FREE" as SubscriptionTier)

		// Create user (with Better Auth required fields)
		const [user] = await this.db
			.insert(users)
			.values({
				name: firstName ?? email.split("@")[0] ?? "User", // Better Auth required field
				email,
				password: hashedPassword,
				emailVerified: false, // Better Auth required field (patients need verification)
				role: "PATIENT" as Role,
			})
			.returning()

		if (!user) {
			throw new BadRequestException("Failed to create user")
		}

		// Create patient info
		await this.db.insert(patientInfos).values({
			userId: user.id,
			firstName,
			middleName: middleName || null,
			lastName,
			gender: (dto.gender || "OTHER") as any,
			dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : new Date(),
			contactNumber: dto.contactNumber!,
			address: dto.address!,
			weight: dto.weight!,
			height: dto.height!,
			bloodType: dto.bloodType!,
			medicalHistory: dto.medicalHistory || null,
			allergies: dto.allergies || null,
			medications: dto.medications || null,
			subscriptionTier: appliedTier,
			maxFaceScans: tierSetting?.maxFaceScans || null,
			subscriptionStartDate: new Date(),
			isSubscriptionActive: true,
		})

		// Create emergency contact if provided
		if (dto.emergencyContactName) {
			await this.db.insert(emergencyContacts).values({
				patientId: user.id,
				contactName: dto.emergencyContactName,
				relationship: dto.emergencyContactRelationship || "",
				contactNumber: dto.emergencyContactNumber || "",
				contactAddress: dto.emergencyContactAddress || null,
			})
		}

		// Create insurance if provided
		if (dto.insuranceProviderName) {
			await this.db.insert(insuranceInfos).values({
				patientId: user.id,
				providerName: dto.insuranceProviderName,
				policyNumber: dto.insurancePolicyNumber || "",
				insuranceContact: dto.insuranceContact || "",
			})
		}

		// Create Better Auth user and session
		const authInstance = this.betterAuthService.getAuthInstance()

		try {
			// Register user in Better Auth (use original password, not hashed)
			await authInstance.api.signUpEmail({
				body: {
					email,
					password: originalPassword,
					name: firstName ?? email.split("@")[0] ?? "User",
				},
			})

			// Sign in to create session
			const sessionResult = await authInstance.api.signInEmail({
				body: {
					email,
					password: originalPassword,
				},
			})

			if (!sessionResult?.token || !sessionResult?.user) {
				throw new BadRequestException("Failed to create session")
			}

			const userProfile = await this.getUserProfile(user.id)

			return {
				user: userProfile,
				session: {
					id: sessionResult.token,
					token: sessionResult.token,
					userId: sessionResult.user.id,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
				},
				sessionToken: sessionResult.token,
			}
		} catch (error: any) {
			throw new BadRequestException(error.message || "Failed to create Better Auth session")
		}
	}

	private async registerOrganization(
		dto: RegisterDto,
		email: string,
		hashedPassword: string,
		originalPassword: string
	) {
		if (!dto.firstName) {
			throw new BadRequestException("Organization name is required")
		}

		const requestedTier = (dto.subscriptionTier || "FREE") as SubscriptionTier
		const [tierSetting] = await this.db
			.select()
			.from(subscriptionTierSettings)
			.where(
				and(
					eq(subscriptionTierSettings.tier, requestedTier),
					eq(subscriptionTierSettings.entityType, "ORGANIZATION" as SubscriptionEntityType)
				)
			)
			.limit(1)

		const appliedTier = tierSetting?.tier || ("FREE" as SubscriptionTier)

		// Create organization
		const [organization] = await this.db
			.insert(organizations)
			.values({
				name: dto.firstName ?? "Organization",
				description: dto.bio || null,
				address: dto.address || null,
				phone: dto.contactNumber || null,
				email,
				website: dto.website || null,
				subscriptionTier: appliedTier,
				maxDoctors: tierSetting?.maxDoctors || null,
				maxPatientsPerDoctor: tierSetting?.maxPatientsPerDoctor || null,
				maxFaceScansPerDoctor: tierSetting?.maxFaceScansPerDoctor || null,
				isSubscriptionActive: true,
				subscriptionStartDate: new Date(),
				approvalStatus: "PENDING",
				approvalStatusUpdatedAt: new Date(),
			})
			.returning()

		if (!organization) {
			throw new BadRequestException("Failed to create organization")
		}

		// Create user (with Better Auth required fields)
		const [user] = await this.db
			.insert(users)
			.values({
				name: dto.firstName ?? email.split("@")[0] ?? "Organization", // Better Auth required field
				email,
				password: hashedPassword,
				emailVerified: false, // Better Auth required field (organizations need approval)
				role: "ORGANIZATION" as Role,
				organizationId: organization.id,
			})
			.returning()

		if (!user) {
			throw new BadRequestException("Failed to create user")
		}

		// Create Better Auth user and session
		const authInstance = this.betterAuthService.getAuthInstance()

		try {
			// Register user in Better Auth (use original password, not hashed)
			await authInstance.api.signUpEmail({
				body: {
					email,
					password: originalPassword,
					name: dto.firstName ?? email.split("@")[0] ?? "Organization",
				},
			})

			// Sign in to create session
			const sessionResult = await authInstance.api.signInEmail({
				body: {
					email,
					password: originalPassword,
				},
			})

			if (!sessionResult?.token || !sessionResult?.user) {
				throw new BadRequestException("Failed to create session")
			}

			const userProfile = await this.getUserProfile(user.id)

			return {
				user: userProfile,
				session: {
					id: sessionResult.token,
					token: sessionResult.token,
					userId: sessionResult.user.id,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
				},
				sessionToken: sessionResult.token,
			}
		} catch (error: any) {
			throw new BadRequestException(error.message || "Failed to create Better Auth session")
		}
	}

	private async registerDoctor(
		dto: RegisterDto,
		email: string,
		hashedPassword: string,
		originalPassword: string
	) {
		const requestedTier = (dto.subscriptionTier || "FREE") as SubscriptionTier
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

		// Create user (with Better Auth required fields)
		const [user] = await this.db
			.insert(users)
			.values({
				name: `${dto.firstName} ${dto.lastName}`.trim() || email.split("@")[0] || "Doctor", // Better Auth required field
				email,
				password: hashedPassword,
				emailVerified: false, // Better Auth required field (doctors need approval)
				role: "DOCTOR" as Role,
				organizationId: dto.organizationId || null,
			})
			.returning()

		if (!user) {
			throw new BadRequestException("Failed to create user")
		}

		// Create doctor info
		await this.db.insert(doctorInfos).values({
			userId: user.id,
			firstName: dto.firstName!,
			lastName: dto.lastName!,
			gender: (dto.gender || "OTHER") as any,
			dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : new Date(),
			contactNumber: dto.contactNumber || "",
			address: dto.address || "",
			bio: dto.bio || "",
			specialization: dto.specialization!,
			qualifications: dto.qualifications!,
			experience: dto.experience!,
			approvalStatus: "PENDING",
			subscriptionTier: appliedTier,
			maxPatients: tierSetting?.maxPatients || null,
			maxFaceScans: tierSetting?.maxFaceScans || null,
			subscriptionStartDate: new Date(),
			isSubscriptionActive: true,
			prcId: dto.prcId || null,
			ptrId: dto.ptrId || null,
			medicalLicenseLevel: dto.medicalLicenseLevel || null,
			philHealthAccreditation: dto.philHealthAccreditation || null,
			licenseNumber: dto.licenseNumber || null,
			licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : null,
			isLicenseActive: dto.isLicenseActive ?? true,
			additionalCertifications: null,
			licenseIssuedBy: null,
			licenseIssuedDate: null,
			renewalRequired: true,
		})

		// Create Better Auth user and session
		const authInstance = this.betterAuthService.getAuthInstance()

		try {
			// Register user in Better Auth (use original password, not hashed)
			await authInstance.api.signUpEmail({
				body: {
					email,
					password: originalPassword,
					name: `${dto.firstName} ${dto.lastName}`.trim() || email.split("@")[0] || "Doctor",
				},
			})

			// Sign in to create session
			const sessionResult = await authInstance.api.signInEmail({
				body: {
					email,
					password: originalPassword,
				},
			})

			if (!sessionResult?.token || !sessionResult?.user) {
				throw new BadRequestException("Failed to create session")
			}

			const userProfile = await this.getUserProfile(user.id)

			return {
				user: userProfile,
				session: {
					id: sessionResult.token,
					token: sessionResult.token,
					userId: sessionResult.user.id,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
				},
				sessionToken: sessionResult.token,
			}
		} catch (error: any) {
			throw new BadRequestException(error.message || "Failed to create Better Auth session")
		}
	}

	async refreshToken(refreshToken: string) {
		// Better Auth handles session refresh automatically via cookies
		// This method is kept for API compatibility
		const authInstance = this.betterAuthService.getAuthInstance()

		try {
			// For now, we'll just return the token as-is since Better Auth handles refresh automatically
			return {
				sessionToken: refreshToken,
				session: {
					id: refreshToken,
					token: refreshToken,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
				},
			}
		} catch (error: any) {
			throw new UnauthorizedException(error.message || "Failed to refresh session")
		}
	}

	async getUserProfile(userId: string) {
		const [user] = await this.db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1)

		if (!user) {
			throw new UnauthorizedException("User not found")
		}

		// Get related info
		const [doctorInfo] =
			user.role === "DOCTOR"
				? await this.db.select().from(doctorInfos).where(eq(doctorInfos.userId, userId)).limit(1)
				: [null]

		const [patientInfo] =
			user.role === "PATIENT"
				? await this.db.select().from(patientInfos).where(eq(patientInfos.userId, userId)).limit(1)
				: [null]

		const [adminInfo] =
			user.role === "ADMIN"
				? await this.db.select().from(adminInfos).where(eq(adminInfos.userId, userId)).limit(1)
				: [null]

	const [organization] = user.organizationId
		? await this.db.select().from(organizations).where(eq(organizations.id, user.organizationId)).limit(1)
		: [null]

	return {
		...user,
		createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
		updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
		profilePictureVerifiedAt:
			user.profilePictureVerifiedAt instanceof Date
				? user.profilePictureVerifiedAt.toISOString()
				: user.profilePictureVerifiedAt,
		doctorInfo: doctorInfo || null,
		patientInfo: patientInfo || null,
		adminInfo: adminInfo || null,
		organization: organization || null,
	}
	}

	async emailExists(email: string): Promise<boolean> {
		const [user] = await this.db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1)
		return !!user
	}

	async logout(userId: string, refreshToken?: string): Promise<void> {
		// Better Auth handles logout via session invalidation
		// This method is kept for API compatibility
		try {
			// Better Auth logout is handled via cookies on the client side
			console.log("Logout initiated (Better Auth handles session invalidation via client-side cookies)")
		} catch (error) {
			// Logout failed - but don't throw error as session may already be invalid
			console.log("Logout completed (session may already be invalid)")
		}
	}
}
