import { Module } from "@nestjs/common"
import { ScheduleModule } from "@nestjs/schedule"

import { ExpiryCleanupService } from "./expiry-cleanup.service"

/**
 * Scheduled housekeeping.
 *
 * Owns the single cron registration. The expired-`verifications` sweep
 * belongs in {@link ExpiryCleanupService}, not in a second scheduler.
 */
@Module({
	imports: [ScheduleModule.forRoot()],
	providers: [ExpiryCleanupService],
	exports: [ExpiryCleanupService],
})
export class MaintenanceModule {}
