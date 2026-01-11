import { Controller, Get, Param } from "@nestjs/common"
import { ZodSerializerDto } from "nestjs-zod"

import { FaceScanResultListResponseDto, FaceScanResultResponseDto } from "@repo/contracts"

import { Public } from "@/shared/decorators/public.decorator"

import { FaceScanService } from "./face-scan.service"

@Controller({ path: "face-scan", version: "1" })
export class FaceScanController {
	constructor(private readonly faceScanService: FaceScanService) {}

	@Public()
	@Get()
	@ZodSerializerDto(FaceScanResultListResponseDto)
	async findAll() {
		const results = await this.faceScanService.findAll()
		return { success: true, data: results }
	}

	@Public()
	@Get(":id")
	@ZodSerializerDto(FaceScanResultResponseDto)
	async findOne(@Param("id") id: string) {
		const result = await this.faceScanService.findOne(id)
		return { success: true, data: result }
	}
}
