import { Module } from "@nestjs/common"

import { MedicalRecordsController } from "./medical-records.controller"
import { MedicalRecordsService } from "./medical-records.service"

@Module({
	controllers: [MedicalRecordsController],
	providers: [MedicalRecordsService],
	exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
