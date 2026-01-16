import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { WebRtcService } from "./webrtc.service"

@Controller({ path: "webrtc", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class WebRtcController {
	constructor(private readonly webrtcService: WebRtcService) {}

	@Get("test")
	async test() {
		return { success: true, message: "WebRTC endpoint working" }
	}

	@Get("turn-token")
	@Roles("ADMIN", "SUPER_ADMIN", "DOCTOR", "PATIENT")
	async getTurnToken() {
		// Return default STUN servers for now
		// TODO: Add Twilio TURN server support if needed
		const iceServers = [
			{ urls: "stun:stun.l.google.com:19302" },
			{ urls: "stun:stun1.l.google.com:19302" },
			{ urls: "stun:stun2.l.google.com:19302" },
			{ urls: "stun:stun3.l.google.com:19302" },
			{ urls: "stun:stun4.l.google.com:19302" },
			{ urls: "stun:stun.stunprotocol.org:3478" },
		]

		return {
			success: true,
			data: {
				iceServers,
			},
		}
	}

	@Get("room/:roomId/doctor")
	@Roles("ADMIN", "SUPER_ADMIN", "DOCTOR", "PATIENT")
	async getDoctorByRoomId(@Param("roomId") roomId: string, @Req() req: Request) {
		const doctor = await this.webrtcService.getDoctorByRoomId(roomId, (req as any).user)
		return {
			success: true,
			data: doctor,
		}
	}

	@Get("room/:roomId/patient")
	@Roles("ADMIN", "SUPER_ADMIN", "DOCTOR", "PATIENT")
	async getPatientByRoomId(@Param("roomId") roomId: string, @Req() req: Request) {
		const patient = await this.webrtcService.getPatientByRoomId(roomId, (req as any).user)
		return {
			success: true,
			data: patient,
		}
	}
}
