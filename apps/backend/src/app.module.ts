import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core"
import { ThrottlerModule } from "@nestjs/throttler"
import { AuthModule } from "@thallesp/nestjs-better-auth"
import { LoggerModule } from "nestjs-pino"
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod"

import { getAuth } from "@repo/auth"

import { HttpExceptionFilter } from "@/common/filters/http-exception.filter"
import { buildPinoHttpOptions } from "@/config/pino-logger.config"
import { V1Module } from "@/modules/v1/v1.module"
import { skipStrictThrottle } from "@/shared/decorators/strict-throttle.decorator"
import { RbacGuard } from "@/shared/guards/rbac.guard"
import { ThrottlerProxyGuard } from "@/shared/guards/throttler-proxy.guard"

import { AuditModule } from "./common/audit/audit.module"
import { ORPCCommonModule } from "./common/orpc/orpc.module"
import { RbacModule } from "./common/rbac/rbac.module"
import { env } from "./config/env.config"

@Module({
	imports: [
		// Core configuration
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
			load: [() => env],
		}),
		// Structured logging (provides the injectable pino-backed Logger).
		// autoLogging is disabled here so this LoggerModule pino-http middleware
		// emits NO request/response log lines: the standalone pino-http middleware
		// registered before Better Auth (bootstrap.ts) is the authoritative
		// request/response logger for all routes. This middleware still runs, but
		// its genReqId reuses the `req.id` already assigned by the pre-auth
		// middleware (see buildPinoHttpOptions), so both agree on one correlation
		// id and the response header is never overwritten with a fresh one.
		LoggerModule.forRoot({ pinoHttp: buildPinoHttpOptions({ autoLogging: false }) }),
		// Rate limiting
		// NOTE: Uses in-memory ThrottlerStorageService (default).
		// Multi-instance deployments require a shared store (e.g. Redis ThrottlerStorageRedis).
		ThrottlerModule.forRoot([
			{
				name: "default",
				ttl: env.THROTTLE_TTL,
				limit: env.THROTTLE_LIMIT,
			},
			{
				name: "strict",
				ttl: env.THROTTLE_STRICT_TTL,
				limit: env.THROTTLE_STRICT_LIMIT,
				// Opt-in only: skipped for every route except handlers marked
				// with @StrictThrottle(). Keeps reads on the `default` limiter.
				skipIf: skipStrictThrottle,
			},
		]),
		// Authentication (controllers disabled - we register versioned routes in setupBetterAuth)
		AuthModule.forRoot({ auth: getAuth(), disableControllers: true }),
		// oRPC setup
		ORPCCommonModule,
		// RBAC services
		// Global: the audit trail is meant to outgrow RBAC (AZ-4).
		AuditModule,
		RbacModule,
		// Versioned modules
		V1Module,
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
			provide: APP_FILTER,
			useClass: HttpExceptionFilter,
		},
		{
			provide: APP_GUARD,
			useClass: ThrottlerProxyGuard,
		},
		{
			provide: APP_GUARD,
			useClass: RbacGuard,
		},
	],
})
export class AppModule {}
