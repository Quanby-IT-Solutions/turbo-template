import { Module } from "@nestjs/common"

import { AuditModule } from "@/common/audit/audit.module"

import { RbacCacheService } from "./rbac-cache.service"
import { RbacService } from "./rbac.service"

@Module({
	imports: [AuditModule],
	providers: [RbacCacheService, RbacService],
	exports: [RbacService, RbacCacheService],
})
export class RbacModule {}
