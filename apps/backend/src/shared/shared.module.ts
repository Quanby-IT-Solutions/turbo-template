import { Global, Module } from "@nestjs/common"

import { AuditService } from "./services/audit.service.js"

@Global()
@Module({
	providers: [AuditService],
	exports: [AuditService],
})
export class SharedModule {}
