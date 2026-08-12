import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core"
import { ThrottlerModule } from "@nestjs/throttler"
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis"
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
import { RedisModule } from "./common/redis/redis.module"
import { REDIS_CLIENT, type RedisClient } from "./common/redis/redis.provider"
import { ResilientThrottlerStorage } from "./common/redis/resilient-throttler.storage"
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
		// Rate limiting (AB-2 / F-38).
		//
		// Counters live in Redis when REDIS_URL is set, so a limit of N is N
		// across the whole cluster rather than N per instance. Without it the
		// module falls back to its in-memory store: correct for a single
		// instance, and the startup warning in redis.provider.ts says so.
		//
		// Degradation is deliberately FAIL-OPEN: if Redis goes away, requests
		// are allowed rather than refused. The throttler is a supporting abuse
		// control, and turning a Redis outage into a total outage trades a
		// small risk for a large one. This is the opposite of the RBAC cache's
		// fail-closed choice, because that one guards correctness.
		ThrottlerModule.forRootAsync({
			inject: [REDIS_CLIENT],
			useFactory: (redis: RedisClient) => ({
				throttlers: [
					{
						name: "default",
						ttl: env.THROTTLE_TTL,
						limit: env.THROTTLE_LIMIT,
					},
					{
						name: "strict",
						ttl: env.THROTTLE_STRICT_TTL,
						limit: env.THROTTLE_STRICT_LIMIT,
						// Opt-in only: skipped for every route except handlers
						// marked with @StrictThrottle(). Keeps reads on `default`.
						skipIf: skipStrictThrottle,
					},
				],
				...(redis
					? { storage: new ResilientThrottlerStorage(new ThrottlerStorageRedisService(redis)) }
					: {}),
			}),
		}),
		// Authentication (controllers disabled - we register versioned routes in setupBetterAuth)
		AuthModule.forRoot({ auth: getAuth(), disableControllers: true }),
		// oRPC setup
		ORPCCommonModule,
		// Shared Redis connection for the throttler and the RBAC cache (AB-2).
		RedisModule,
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
