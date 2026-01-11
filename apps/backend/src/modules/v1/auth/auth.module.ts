import { Global, Module } from "@nestjs/common"
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth"

import { auth } from "@repo/auth"
import { DBModule } from "@/common/database/database.module"
import { SharedModule } from "@/shared/shared.module"

import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { BetterAuthController } from "./better-auth.controller"
import { BetterAuthService } from "./better-auth.service"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"

@Global() // Make AuthModule global so BetterAuthGuard and BetterAuthService are available everywhere
@Module({
	imports: [
		DBModule,
		SharedModule,
		BetterAuthModule.forRoot({
			auth,
		}),
	],
	controllers: [AuthController, BetterAuthController],
	providers: [AuthService, BetterAuthService, BetterAuthGuard],
	exports: [AuthService, BetterAuthService, BetterAuthGuard],
})
export class AuthModule {}
