import { Module } from "@nestjs/common"

import { DiagnosticsController } from "./diagnostics.controller"

/**
 * Development-only module. `V1Module` imports it conditionally, so in any other
 * environment its routes are never registered — see diagnostics.controller.ts.
 */
@Module({
	controllers: [DiagnosticsController],
})
export class DiagnosticsModule {}
