import { Module } from "@nestjs/common"

import { env } from "@/config/env.config"

import { DiagnosticsModule } from "./diagnostics/diagnostics.module"
import { ExamplesModule } from "./examples/examples.module"
import { HealthModule } from "./health/health.module"
import { MeModule } from "./me/me.module"
import { RbacAdminModule } from "./rbac/rbac.module"
import { TicketsModule } from "./tickets/tickets.module"

@Module({
	imports: [
		ExamplesModule,
		HealthModule,
		MeModule,
		RbacAdminModule,
		TicketsModule,
		// Sentry diagnostics exist ONLY in development. Conditional import rather
		// than a runtime guard on the handler: the routes are then absent from the
		// router entirely (404), so there is no guard to misconfigure and no
		// deliberate-error endpoint sitting in a production build.
		...(env.NODE_ENV === "development" ? [DiagnosticsModule] : []),
	],
})
export class V1Module {}
