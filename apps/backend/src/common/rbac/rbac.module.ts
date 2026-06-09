import { Module } from "@nestjs/common"

import { RbacCacheService } from "./rbac-cache.service"
import { RbacService } from "./rbac.service"

@Module({
	providers: [RbacCacheService, RbacService],
	exports: [RbacService, RbacCacheService],
})
export class RbacModule {}
