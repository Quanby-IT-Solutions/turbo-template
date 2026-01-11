import { Module } from "@nestjs/common"

import { FaceScanController } from "./face-scan.controller"
import { FaceScanService } from "./face-scan.service"

@Module({
	controllers: [FaceScanController],
	providers: [FaceScanService],
	exports: [FaceScanService],
})
export class FaceScanModule {}
