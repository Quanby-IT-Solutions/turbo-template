import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const WebRtcRoomSchema = z.object({
	roomId: z.string(),
	doctorId: z.string().uuid(),
	patientId: z.string().uuid(),
	consultationId: z.string().uuid().optional(),
	status: z.enum(["ACTIVE", "ENDED", "PENDING"]),
	createdAt: z.string().datetime(),
})

// ============================================================================
// DTOs
// ============================================================================

export class WebRtcRoomResponseDto extends createZodDto(ApiSuccessResponseSchema(WebRtcRoomSchema)) {}
