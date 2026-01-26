import { Module } from "@nestjs/common"

import { DoctorSchedulesController } from "./doctor-schedules.controller"
import { DoctorSchedulesService } from "./doctor-schedules.service"

@Module({
	controllers: [DoctorSchedulesController],
	providers: [DoctorSchedulesService],
	exports: [DoctorSchedulesService],
})
export class DoctorSchedulesModule {}
