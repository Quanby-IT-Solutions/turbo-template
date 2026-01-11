import { Module } from "@nestjs/common"

import { LabRequestsController } from "./lab-requests.controller"
import { LabRequestsService } from "./lab-requests.service"

@Module({
	controllers: [LabRequestsController],
	providers: [LabRequestsService],
	exports: [LabRequestsService],
})
export class LabRequestsModule {}
