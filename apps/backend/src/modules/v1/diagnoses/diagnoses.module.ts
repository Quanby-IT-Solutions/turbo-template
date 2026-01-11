import { Module } from "@nestjs/common"

import { DiagnosesController } from "./diagnoses.controller"
import { DiagnosesService } from "./diagnoses.service"

@Module({
	controllers: [DiagnosesController],
	providers: [DiagnosesService],
	exports: [DiagnosesService],
})
export class DiagnosesModule {}
