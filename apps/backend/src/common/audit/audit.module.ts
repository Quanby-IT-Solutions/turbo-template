import { Global, Module } from "@nestjs/common"

import { AuditService } from "./audit.service"

/**
 * Append-only audit trail (AZ-4 / F-17).
 *
 * Global because the trail is meant to outgrow RBAC: auth events and other
 * domains adopt it by injecting {@link AuditService}, and making them each
 * import a module would encourage the shortcut this ticket exists to prevent —
 * inserting into `audit_log` directly.
 */
@Global()
@Module({
	providers: [AuditService],
	exports: [AuditService],
})
export class AuditModule {}
