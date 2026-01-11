import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core"
import { AuthModule } from "@thallesp/nestjs-better-auth"
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod"

import { auth } from "@repo/auth"

import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter"
import { DBModule } from "@/common/database/database.module"
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter"
import { HealthModule } from "@/common/health/health.module"
import { AppModule as V1AppModule } from "@/modules/v1/app.module"
import { LoggingInterceptor } from "@/shared/interceptors/logging.interceptor"
import { SharedModule } from "@/shared/shared.module"
import { TransformInterceptor } from "@/shared/interceptors/transform.interceptor"

@Module({
	imports: [
		// Core configuration
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
		}),
		// Common modules
		DBModule,
		HealthModule,
		SharedModule,
		// Authentication
		AuthModule.forRoot({ auth }),
		// Feature modules
		V1AppModule,
	],
	providers: [
		// Global providers
		{
			provide: APP_PIPE,
			useClass: ZodValidationPipe,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ZodSerializerInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: TransformInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: LoggingInterceptor,
		},
		{
			provide: APP_FILTER,
			useClass: AllExceptionsFilter,
		},
		{
			provide: APP_FILTER,
			useClass: HttpExceptionFilter,
		},
	],
})
export class MainModule {}
