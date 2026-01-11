import { Module } from "@nestjs/common"

import { SelfCheckController } from "./self-check.controller"
import { SelfCheckService } from "./self-check.service"

@Module({
	controllers: [SelfCheckController],
	providers: [SelfCheckService],
	exports: [SelfCheckService],
})
export class SelfCheckModule {}
