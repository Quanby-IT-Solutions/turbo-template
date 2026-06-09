import { Module } from "@nestjs/common"

import { RbacModule } from "@/common/rbac/rbac.module"

import { RbacAdminService } from "./rbac-admin.service"
import { RbacController } from "./rbac.controller"

@Module({
	imports: [RbacModule],
	controllers: [RbacController],
	providers: [RbacAdminService],
})
export class RbacAdminModule {}
