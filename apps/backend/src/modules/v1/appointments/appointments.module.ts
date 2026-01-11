import { Module } from "@nestjs/common"

import { AppointmentsController } from "./appointments.controller"
import { AppointmentsService } from "./appointments.service"

@Module({
	controllers: [AppointmentsController],
	providers: [AppointmentsService],
	exports: [AppointmentsService],
})
export class AppointmentsModule {}
