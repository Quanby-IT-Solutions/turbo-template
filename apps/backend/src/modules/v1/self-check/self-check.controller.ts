import { Controller, Get } from "@nestjs/common"

import { Public } from "@/shared/decorators/public.decorator"

import { SelfCheckService } from "./self-check.service"

@Controller({ path: "self-check", version: "1" })
export class SelfCheckController {
	constructor(private readonly selfCheckService: SelfCheckService) {}

	@Public()
	@Get()
	async getStatus() {
		return { success: true, message: "Self-check endpoint" }
	}
}
