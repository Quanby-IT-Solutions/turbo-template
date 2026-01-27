import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards, UsePipes } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto, ZodValidationPipe } from "nestjs-zod"

import { 
  SystemUserListResponseDto, 
  UserQueryDto, 
  SystemUserResponseDto, 
  CreateUserDto,
  UpdateUserDto,
  ResetPasswordDto
} from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { RolesGuard } from "@/shared/guards/roles.guard"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"

import { UsersService } from "./users.service"

@Controller({ path: "users", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	@ZodSerializerDto(SystemUserListResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async findAll(@Query() query: UserQueryDto) {
		const users = await this.usersService.findAll(query)
		return {
			success: true,
			data: users,
		}
	}

	@Get(":id")
	@ZodSerializerDto(SystemUserResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async findOne(@Param("id") id: string) {
		const user = await this.usersService.findOne(id)
		return {
			success: true,
			data: user,
		}
	}

	@Post()
	@ZodSerializerDto(SystemUserResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async create(@Body() body: any) {
		console.log('📝 Raw request body:', body)
		console.log('📝 Body type:', typeof body)
		console.log('📝 Body keys:', Object.keys(body || {}))
		
		// Manual validation with better error messages
		try {
			const dto = body as CreateUserDto
			console.log('📝 Creating user with:', JSON.stringify(dto, null, 2))
			const user = await this.usersService.create(dto)
			return {
				success: true,
				data: user,
			}
		} catch (error) {
			console.error('❌ Error creating user:', error)
			throw error
		}
	}

	@Put(":id")
	@ZodSerializerDto(SystemUserResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
		const user = await this.usersService.update(id, dto)
		return {
			success: true,
			data: user,
		}
	}

	@Delete(":id")
	@Roles("ADMIN", "SUPER_ADMIN")
	async delete(@Param("id") id: string) {
		await this.usersService.delete(id)
		return {
			success: true,
			message: "User deleted successfully",
		}
	}

	@Patch(":id/deactivate")
	@ZodSerializerDto(SystemUserResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async deactivate(@Param("id") id: string) {
		const user = await this.usersService.deactivate(id)
		return {
			success: true,
			data: user,
		}
	}

	@Patch(":id/activate")
	@ZodSerializerDto(SystemUserResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async activate(@Param("id") id: string) {
		const user = await this.usersService.activate(id)
		return {
			success: true,
			data: user,
		}
	}

	@Post(":id/reset-password")
	@ZodSerializerDto(SystemUserResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async resetPassword(@Param("id") id: string, @Body() dto: ResetPasswordDto) {
		const user = await this.usersService.resetPassword(id, dto.newPassword)
		return {
			success: true,
			data: user,
		}
	}
}
