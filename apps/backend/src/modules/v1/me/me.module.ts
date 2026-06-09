import { Module } from "@nestjs/common"

import { RbacModule } from "@/common/rbac/rbac.module"

import { MeController } from "./me.controller"

@Module({
	imports: [RbacModule],
	controllers: [MeController],
})
export class MeModule {}
