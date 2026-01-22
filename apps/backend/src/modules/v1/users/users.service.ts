import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { eq, ilike, sql, and } from "drizzle-orm"
import * as bcrypt from "bcryptjs"

import { users } from "@repo/db/schema"
import type { CreateUserDto, UpdateUserDto } from "@repo/contracts"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class UsersService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll(query: { page?: number; limit?: number; search?: string; role?: string }) {
		const page = query.page || 1
		const limit = query.limit || 10
		const offset = (page - 1) * limit

		const whereConditions: any[] = []

		if (query.search) {
			whereConditions.push(
				sql`${users.name} ILIKE ${`%${query.search}%`} OR ${users.email} ILIKE ${`%${query.search}%`}`
			)
		}

		if (query.role) {
			whereConditions.push(eq(users.role, query.role as any))
		}

		const [usersList, countResult] = await Promise.all([
			this.db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					emailVerified: users.emailVerified,
					image: users.image,
					role: users.role,
					organizationId: users.organizationId,
					createdAt: users.createdAt,
					updatedAt: users.updatedAt,
					profilePicture: users.profilePicture,
					profilePictureVerified: users.profilePictureVerified,
					profilePictureVerifiedBy: users.profilePictureVerifiedBy,
					profilePictureVerifiedAt: users.profilePictureVerifiedAt,
				})
				.from(users)
				.where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
				.limit(limit)
				.offset(offset)
				.orderBy(sql`${users.createdAt} DESC`),
			this.db
				.select({ count: sql<number>`count(*)::int`.as("count") })
				.from(users)
				.where(whereConditions.length > 0 ? and(...whereConditions) : undefined),
		])

		return usersList.map(user => ({
			...user,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
			profilePictureVerifiedAt: user.profilePictureVerifiedAt?.toISOString() || null,
		}))
	}

	async findOne(id: string) {
		const [user] = await this.db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				emailVerified: users.emailVerified,
				image: users.image,
				role: users.role,
				organizationId: users.organizationId,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
				profilePicture: users.profilePicture,
				profilePictureVerified: users.profilePictureVerified,
				profilePictureVerifiedBy: users.profilePictureVerifiedBy,
				profilePictureVerifiedAt: users.profilePictureVerifiedAt,
			})
			.from(users)
			.where(eq(users.id, id))

		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`)
		}

		return {
			...user,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
			profilePictureVerifiedAt: user.profilePictureVerifiedAt?.toISOString() || null,
		}
	}

	async create(dto: CreateUserDto) {
		// Check if email already exists
		const [existingUser] = await this.db
			.select()
			.from(users)
			.where(eq(users.email, dto.email))
			.limit(1)

		if (existingUser) {
			throw new BadRequestException("Email already exists")
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(dto.password, 10)

		const [newUser] = await this.db
			.insert(users)
			.values({
				name: dto.name,
				email: dto.email,
				password: hashedPassword,
				role: dto.role,
				organizationId: dto.organizationId || null,
				emailVerified: false,
				profilePictureVerified: false,
			})
			.returning({
				id: users.id,
				name: users.name,
				email: users.email,
				emailVerified: users.emailVerified,
				image: users.image,
				role: users.role,
				organizationId: users.organizationId,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
				profilePicture: users.profilePicture,
				profilePictureVerified: users.profilePictureVerified,
				profilePictureVerifiedBy: users.profilePictureVerifiedBy,
				profilePictureVerifiedAt: users.profilePictureVerifiedAt,
			})

		if (!newUser) {
			throw new BadRequestException("Failed to create user")
		}

		return {
			...newUser,
			createdAt: newUser.createdAt.toISOString(),
			updatedAt: newUser.updatedAt.toISOString(),
			profilePictureVerifiedAt: newUser.profilePictureVerifiedAt?.toISOString() || null,
		}
	}

	async update(id: string, dto: UpdateUserDto) {
		// Check if user exists
		await this.findOne(id)

		// If email is being updated, check if it's already in use
		if (dto.email) {
			const [existingUser] = await this.db
				.select()
				.from(users)
				.where(and(eq(users.email, dto.email), sql`${users.id} != ${id}`))
				.limit(1)

			if (existingUser) {
				throw new BadRequestException("Email already exists")
			}
		}

		const [updatedUser] = await this.db
			.update(users)
			.set({
				...dto,
				updatedAt: new Date(),
			})
			.where(eq(users.id, id))
			.returning({
				id: users.id,
				name: users.name,
				email: users.email,
				emailVerified: users.emailVerified,
				image: users.image,
				role: users.role,
				organizationId: users.organizationId,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
				profilePicture: users.profilePicture,
				profilePictureVerified: users.profilePictureVerified,
				profilePictureVerifiedBy: users.profilePictureVerifiedBy,
				profilePictureVerifiedAt: users.profilePictureVerifiedAt,
			})

		if (!updatedUser) {
			throw new NotFoundException(`User with ID ${id} not found`)
		}

		return {
			...updatedUser,
			createdAt: updatedUser.createdAt.toISOString(),
			updatedAt: updatedUser.updatedAt.toISOString(),
			profilePictureVerifiedAt: updatedUser.profilePictureVerifiedAt?.toISOString() || null,
		}
	}

	async delete(id: string) {
		// Check if user exists
		const user = await this.findOne(id)

		// Prevent deleting yourself (optional safety check)
		// You might want to pass current user ID to prevent self-deletion

		try {
			await this.db.delete(users).where(eq(users.id, id))
			console.log(`✅ User deleted successfully: ${user.email}`)
		} catch (error) {
			console.error(`❌ Failed to delete user ${id}:`, error)
			throw new BadRequestException('Failed to delete user')
		}
	}

	async deactivate(id: string) {
		// For now, we'll use emailVerified as a way to deactivate
		// In the future, you might want to add an isActive field
		console.log(`🔒 Deactivating user: ${id}`)
		const user = await this.update(id, { emailVerified: false })
		console.log(`✅ User deactivated: ${user.email}`)
		return user
	}

	async activate(id: string) {
		console.log(`🔓 Activating user: ${id}`)
		const user = await this.update(id, { emailVerified: true })
		console.log(`✅ User activated: ${user.email}`)
		return user
	}

	async resetPassword(id: string, newPassword: string) {
		// Check if user exists
		const user = await this.findOne(id)
		console.log(`🔑 Resetting password for user: ${user.email}`)

		// Hash new password
		const hashedPassword = await bcrypt.hash(newPassword, 10)

		const [updatedUser] = await this.db
			.update(users)
			.set({
				password: hashedPassword,
				updatedAt: new Date(),
			})
			.where(eq(users.id, id))
			.returning({
				id: users.id,
				name: users.name,
				email: users.email,
				emailVerified: users.emailVerified,
				image: users.image,
				role: users.role,
				organizationId: users.organizationId,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
				profilePicture: users.profilePicture,
				profilePictureVerified: users.profilePictureVerified,
				profilePictureVerifiedBy: users.profilePictureVerifiedBy,
				profilePictureVerifiedAt: users.profilePictureVerifiedAt,
			})

		if (!updatedUser) {
			throw new NotFoundException(`User with ID ${id} not found`)
		}

		console.log(`✅ Password reset successfully for: ${updatedUser.email}`)

		return {
			...updatedUser,
			createdAt: updatedUser.createdAt.toISOString(),
			updatedAt: updatedUser.updatedAt.toISOString(),
			profilePictureVerifiedAt: updatedUser.profilePictureVerifiedAt?.toISOString() || null,
		}
	}
}
