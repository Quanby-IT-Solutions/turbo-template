import { Module } from "@nestjs/common"

import { ConsultationsController } from "./consultations.controller"
import { ConsultationsService } from "./consultations.service"

@Module({
	controllers: [ConsultationsController],
	providers: [ConsultationsService],
	exports: [ConsultationsService],
})
export class ConsultationsModule {}
