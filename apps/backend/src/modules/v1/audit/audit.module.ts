import { Module } from "@nestjs/common"

import { AuditController } from "./audit.controller"
import { AuditService as ModuleAuditService } from "./audit.service"
import { AuditService as SharedAuditService } from "@/shared/services/audit.service"

@Module({
	controllers: [AuditController],
	providers: [ModuleAuditService, SharedAuditService],
	exports: [ModuleAuditService],
})
export class AuditModule {}
